// Adaptado del código proporcionado por el usuario para el emulador.
// Se enfoca únicamente en el radar y el satélite de RainViewer sobre un mapa de Mapbox.

const MAPBOX_API_KEY = 'pk.eyJ1IjoiaGFzdHl0dWJlIiwiYSI6ImNsa2hkZTh6bzAwazQzZHFyNmF5aTRsZGwifQ.5QJvYIHo0odZ5jCFApV7yw';
let maps = {}; // Almacena las instancias de los mapas (regional y zoom)
let radarData = {
    regional: { map: null, radarLayers: {}, animationTimer: null, animationPosition: 0, mapFrames: [] },
    zoomed: { map: null, radarLayers: {}, animationTimer: null, animationPosition: 0, mapFrames: [] }
};

/**
 * Inicializa un mapa de Leaflet en el contenedor especificado.
 * @param {string} type - 'regional' o 'zoomed'
 * @param {string} containerId - El ID del div contenedor del mapa.
 * @param {number} lat - Latitud inicial.
 * @param {number} lon - Longitud inicial.
 * @param {number} zoom - Nivel de zoom inicial.
 */
function initRadarMap(type, containerId, lat, lon, zoom) {
    // Si el mapa ya existe, no hacer nada.
    if (radarData[type].map) {
        // Solo asegúrate de que el tamaño es correcto si la ventana ha cambiado.
        radarData[type].map.invalidateSize();
        return;
    }

    const map = L.map(containerId, {
        zoomControl: false,
        preferCanvas: true,
    }).setView([lat, lon], zoom);

    // Capa base satélite de Mapbox
    L.tileLayer(
        `https://api.mapbox.com/styles/v1/mapbox/satellite-v9/tiles/512/{z}/{x}/{y}?access_token=${MAPBOX_API_KEY}`,
        {
            tileSize: 512,
            zoomOffset: -1,
            zIndex: 1
        }
    ).addTo(map);

    // Capa de etiquetas para efecto híbrido
    L.tileLayer(
        `https://api.mapbox.com/styles/v1/mapbox/streets-v11/tiles/512/{z}/{x}/{y}?access_token=${MAPBOX_API_KEY}`,
        {
            tileSize: 512,
            zoomOffset: -1,
            zIndex: 2,
            opacity: 0.7
        }
    ).addTo(map);

    radarData[type].map = map;
    loadAndAnimateRadar(type);
}

/**
 * Carga los datos del radar de RainViewer y comienza la animación.
 * @param {string} type - 'regional' o 'zoomed'
 */
async function loadAndAnimateRadar(type) {
    try {
        const response = await fetch(`https://api.rainviewer.com/public/weather-maps.json?t=${Date.now()}`);
        if (!response.ok) throw new Error("No se pudieron cargar los datos del radar.");
        const apiData = await response.json();

        const frames = [...apiData.radar.past, ...(apiData.radar.nowcast || [])].slice(-10); // Últimos 10 frames
        radarData[type].mapFrames = frames;

        // Limpiar capas antiguas
        Object.values(radarData[type].radarLayers).forEach(layer => radarData[type].map.removeLayer(layer));
        radarData[type].radarLayers = {};

        // Crear nuevas capas
        frames.forEach(frame => {
            radarData[type].radarLayers[frame.path] = L.tileLayer(`${apiData.host}${frame.path}/256/{z}/{x}/{y}/2/1_1.png`, { // colorScheme=2 (TWC), smooth=1, snow=1
                tileSize: 256,
                opacity: 0,
                zIndex: 200
            }).addTo(radarData[type].map);
        });

        startRadarAnimation(type);
    } catch (error) {
        console.error("Error al cargar el radar:", error);
    }
}

/**
 * Muestra un frame específico de la animación del radar.
 * @param {string} type - 'regional' o 'zoomed'
 * @param {number} position - El índice del frame a mostrar.
 */
function showRadarFrame(type, position) {
    const data = radarData[type];
    if (!data.mapFrames.length) return;
    
    data.animationPosition = position;
    const frame = data.mapFrames[position];

    // Ocultar todas las capas
    Object.values(data.radarLayers).forEach(layer => layer.setOpacity(0));

    // Mostrar la capa del frame actual
    if (data.radarLayers[frame.path]) {
        data.radarLayers[frame.path].setOpacity(0.7); // Opacidad estándar
    }
}

/**
 * Inicia el bucle de animación para el radar.
 * @param {string} type - 'regional' o 'zoomed'
 */
function startRadarAnimation(type) {
    stopRadarAnimation(type);
    const data = radarData[type];
    if (!data.mapFrames.length) return;

    function nextFrame() {
        data.animationPosition = (data.animationPosition + 1) % data.mapFrames.length;
        showRadarFrame(type, data.animationPosition);

        const speed = (data.animationPosition === data.mapFrames.length - 1) ? 2000 : 250; // Pausa en el último frame
        data.animationTimer = setTimeout(nextFrame, speed);
    }

    nextFrame();
}

/**
 * Detiene la animación del radar.
 * @param {string} type - 'regional' o 'zoomed'
 */
function stopRadarAnimation(type) {
    if (radarData[type].animationTimer) {
        clearTimeout(radarData[type].animationTimer);
        radarData[type].animationTimer = null;
    }
}