﻿window.CONFIG = {
  crawl: `Situación General: En horas de la madrugada y la mañana, se espera nubosidad productora de lluvias y lloviznas en la
Guayana Esequiba, Bolívar, Amazonas, Delta Amacuro, Sucre, Monagas, Anzoátegui, la Guaira, norte de Aragua,
Llanos Centrales/Occidentales, piedemonte andino y sur del Zulia; el resto del territorio nacional se mantendrá
parcialmente nublado. En hora vespertinas y nocturnas, se estima abundante nubosidad en la mayor parte del territorio
nacional, productora de precipitaciones de intensidad variable y actividad eléctrica, especialmente en zonas de la
Guayana Esequiba, Delta Amacuro, Bolívar, Amazonas, Anzoátegui, Miranda, Distrito Capital, la Guaira,
Aragua, Carabobo, Llanos Centrales y Occidentales..`,
  greeting: 'Tu tiempo local',
  language: 'es-ES', // Soportado en TWC API
  countryCode: 'ES', // Soportado en TWC API (para la clave postal)
  units: 'm', // Soportado en TWC API (e = Inglés (imperial), m = Métrico, h = Híbrido (UK)),
  unitField: 'metric', // Soportado en TWC API. Este campo se llenará automáticamente. (imperial = e, metric = m, uk_hybrid = h)
  loop: false,
  locationMode: "POSTAL",
  secrets: {
    // Possibly deprecated key: See issue #29
    // twcAPIKey: 'e1f10a1e78da46f5b10a1e78da96f525'
    twcAPIKey: 'e1f10a1e78da46f5b10a1e78da96f525'
  },

  // Config Functions (index.html settings manager)
  locationOptions:[],
  addLocationOption: (id, name, desc) => {
    CONFIG.locationOptions.push({
      id,
      name,
      desc,
    })
  },
  options: [],
  addOption: (id, name, desc) => {
    CONFIG.options.push({
      id,
      name,
      desc,
    })
  },
  submit: (btn, e) => {
    let args = {}
    const currentLoop = (localStorage.getItem('loop') === 'y')
    CONFIG.locationOptions.forEach((opt) => {
      args[opt.id] = getElement(`${opt.id}-text`).value
      args[`${opt.id}-button`] = getElement(`${opt.id}-button`).checked
      if (!currentLoop) {
        localStorage.setItem(opt.id, args[opt.id])
      }
    })
    args['countryCode'] = getElement('country-code-text').value
    if (!currentLoop) {
      localStorage.setItem('countryCode', args['countryCode'])
    }
    CONFIG.options.forEach((opt) => {
      args[opt.id] = getElement(`${opt.id}-text`).value
      if (!currentLoop) {
        localStorage.setItem(opt.id, args[opt.id])
      }
    })
    console.log(args)
    if (currentLoop) {
      if (localStorage.getItem('crawlText')) CONFIG.crawl = localStorage.getItem('crawlText')
      if (localStorage.getItem('greetingText')) CONFIG.greeting = localStorage.getItem('greetingText')
      if (localStorage.getItem('countryCode')) CONFIG.countryCode = localStorage.getItem('countryCode')
    } else {
      if (args.crawlText !== '') CONFIG.crawl = args.crawlText
      if (args.greetingText !== '') CONFIG.greeting = args.greetingText
      if (args.countryCode !== '') CONFIG.countryCode = args.countryCode
      if (args.loop === 'y') CONFIG.loop = true
    }
    
    if (args['airport-code-button']==true){ 
      CONFIG.locationMode="AIRPORT" 
      if(args['airport-code'].length==0){
        alert("Please enter an airport code")
        return
      }
    } 
    else { 
      CONFIG.locationMode="POSTAL" 
      if(!currentLoop && args['zip-code'].length==0){
        alert("Please enter a postal code")
        return
      }

    }
    
    zipCode = args['zip-code'] || localStorage.getItem('zip-code')
    airportCode = args['airport-code'] || localStorage.getItem('airport-code')
    
    CONFIG.unitField = CONFIG.units === 'm' ? 'metric' : (CONFIG.units === 'h' ? 'uk_hybrid' : 'imperial')
    fetchCurrentWeather();
  },
  load: () => {
    let settingsPrompt = getElement('settings-prompt')
    let advancedSettingsOptions = getElement('advanced-settings-options')

    //Advanced Options Setup
    CONFIG.options.forEach((option) => {
      //<div class="regular-text settings-item settings-text">Zip Code</div>
      let label = document.createElement('div')
        label.classList.add('strong-text', 'settings-item', 'settings-text', 'settings-padded')
        label.style.textAlign='left'
      label.appendChild(document.createTextNode(option.name))
      label.id = `${option.id}-label`
      //<input class="settings-item settings-text" type="text" id="zip-code-text">
      let textbox = document.createElement('textarea')
      textbox.classList.add('settings-item', 'settings-text', 'settings-input')
      textbox.type = 'text'
      textbox.style.fontSize = '20px'
      textbox.placeholder = option.desc
      textbox.id = `${option.id}-text`
      textbox.style.maxWidth='320px'
      textbox.style.minWidth='320px'
      textbox.style.height='100px'
      textbox.style.marginTop='10px'
      if (localStorage.getItem(option.id)) textbox.value = localStorage.getItem(option.id)
      let br = document.createElement('br')
      advancedSettingsOptions.appendChild(label)
      advancedSettingsOptions.appendChild(textbox)
      advancedSettingsOptions.appendChild(br)
      //<br>
    })

    let advancedButtonContainer = document.createElement('div')
    advancedButtonContainer.classList.add('settings-container')
    settingsPrompt.appendChild(advancedButtonContainer)
    let advancedButton = document.createElement('button')
    advancedButton.innerHTML = "Show advanced options"
    advancedButton.id = "advanced-options-text"
    advancedButton.setAttribute('onclick', 'toggleAdvancedSettings()')
    advancedButton.classList.add('regular-text', 'settings-input', 'button')
    advancedButtonContainer.appendChild(advancedButton)
    //<button class="setting-item settings-text" id="submit-button" onclick="checkZipCode();" style="margin-bottom: 10px;">Start</button>-->
    let btn = document.createElement('button')
    btn.classList.add('setting-item', 'settings-text', 'settings-input', 'button')
    btn.id = 'submit-button'
    btn.onclick = CONFIG.submit
    btn.style = 'margin-bottom: 10px;'
    btn.appendChild(document.createTextNode('Start'))
    settingsPrompt.appendChild(btn)
    if (CONFIG.loop || localStorage.getItem('loop') === 'y') {
      CONFIG.loop = true;
      hideSettings();
      CONFIG.submit()
    }
  }
}

CONFIG.unitField = CONFIG.units === 'm' ? 'metric' : (CONFIG.units === 'h' ? 'uk_hybrid' : 'imperial')