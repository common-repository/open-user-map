window.addEventListener('load', function(e) {

  // FUNCTIONS

  function getParameterByName(name) {
    name = name.replace(/[\[]/, "\\[").replace(/[\]]/, "\\]");
    const regex = new RegExp("[\\?&]" + name + "=([^&#]*)"),
        results = regex.exec(location.search);
    return results === null ? "" : decodeURIComponent(results[1].replace(/\+/g, " "));
  }

  function latLngToBounds(lat, lng, zoom, width, height){
    const EARTH_CIR_METERS = 40075016.686;
    const degreesPerMeter = 360 / EARTH_CIR_METERS;
    const metersPerPixelEW = EARTH_CIR_METERS / Math.pow(2, zoom + 8);
    const metersPerPixelNS = EARTH_CIR_METERS / Math.pow(2, zoom + 8) * Math.cos(lat * Math.PI / 180);

    const shiftMetersEW = width/2 * metersPerPixelEW;
    const shiftMetersNS = height/2 * metersPerPixelNS;

    const shiftDegreesEW = shiftMetersEW * degreesPerMeter;
    const shiftDegreesNS = shiftMetersNS * degreesPerMeter;

    // [[south, west], [north, east]]
    return [[lat-shiftDegreesNS, lng-shiftDegreesEW], [lat+shiftDegreesNS, lng+shiftDegreesEW]];
  }

  function customAutoSuggestText(text,val) {
    return '<div><img src="' + val.layer.options.icon.options.iconUrl + '" />' + val.layer.options.title + '</div>';
  }

  function updatePreview() {
    this.nextElementSibling.classList.add('active');
    this.nextElementSibling.querySelector('span').textContent = this.files[0].name;
  }

  function editLocation(post_id) {
    // Trigger the Add Location button to open the form
    document.getElementById('open-add-location-overlay').click();

    // Wait for the form to be visible (use a small timeout if necessary)
    setTimeout(function() {
        // Retrieve the location data (this assumes the data is available in JavaScript, possibly as a global variable or via an AJAX call)
        let locationData = oum_all_locations.find(location => location.post_id == post_id);

        if (locationData) {
            // Prefill the form fields with the location data
            const titleField = document.querySelector('input[name="oum_location_title"]');
            if (titleField) titleField.value = locationData.title;

            const textField = document.querySelector('textarea[name="oum_location_text"]');
            if (textField) textField.value = locationData.text;

            const addressField = document.querySelector('input[name="oum_location_address"]');
            if (addressField) addressField.value = locationData.address;

            const latField = document.querySelector('input[name="oum_location_lat"]');
            if (latField) latField.value = locationData.lat;

            const lngField = document.querySelector('input[name="oum_location_lng"]');
            if (lngField) lngField.value = locationData.lng;

            // Add the location marker to the map
            const coords = L.latLng(locationData.lat, locationData.lng);
            oumMap2.fire('click', {
                latlng: coords
            });

            // Set the map view to the location
            oumMap2.setView(coords, oumMap2.getZoom());

            // Marker categories
            if (locationData.types) {
                locationData.types.forEach(type => {
                    const selectBox = document.querySelector(`select[name="oum_marker_icon[]"]`);
                    if (selectBox) {
                        selectBox.value = type;
                    } else {
                        const checkbox = document.querySelector(`input[name="oum_marker_icon[]"][value="${type}"]`);
                        if (checkbox) {
                            checkbox.checked = true;
                        }
                    }
                });
            }

            // Custom fields
            if (locationData.custom_fields) {
                locationData.custom_fields.forEach(custom_field => {
                    if(custom_field.val.length > 0) {
                        if(custom_field.fieldtype == 'checkbox') {
                            custom_field.val.forEach(val => {
                                const checkbox = document.querySelector(`input[name="oum_location_custom_fields[${custom_field.index}][]"][value="${val}"]`);
                                if (checkbox) checkbox.checked = true;
                            });
                        } else if(custom_field.fieldtype == 'radio') {
                            const radio = document.querySelector(`input[name="oum_location_custom_fields[${custom_field.index}]"][value="${custom_field.val}"]`);
                            if (radio) radio.checked = true;
                        } else if(custom_field.fieldtype == 'select') {
                            const select = document.querySelector(`select[name="oum_location_custom_fields[${custom_field.index}]"]`);
                            if (select) select.value = custom_field.val;
                        } else {
                            const input = document.querySelector(`input[name="oum_location_custom_fields[${custom_field.index}]"]`);
                            if (input) input.value = custom_field.val;
                        }
                    }
                });
            }

            // Image
            if (locationData.image) {
                const imageField = document.querySelector('input[name="oum_location_image"]');
                if (imageField) {
                    // Remove the required attribute (in case it was set)
                    imageField.required = false;

                    // Update the image preview
                    const label = imageField.nextElementSibling;
                    if (label) {
                        label.classList.add('active');
                        label.querySelector('span').textContent = locationData.image.split('/').pop();
                    }
                }
            }

            // Audio
            if (locationData.audio) {
                const audioField = document.querySelector('input[name="oum_location_audio"]');
                if (audioField) {
                    // Remove the required attribute (in case it was set)
                    audioField.required = false;

                    // Update the audio preview
                    const label = audioField.nextElementSibling;
                    if (label) {
                        label.classList.add('active');
                        label.querySelector('span').textContent = locationData.audio.split('/').pop();
                    }
                }
            }

            // Set the form action or hidden input to indicate this is an edit and not a new submission
            const postIdField = document.querySelector('input[name="oum_post_id"]');
            if (postIdField) postIdField.value = locationData.post_id;
        }
    }, 500); // Adjust timeout as needed
  }

  // Create leaflet markers based on "oum_all_locations" json
  function addMarkers() {
    oum_all_locations.forEach(location => {
      let marker = L.marker([location.lat, location.lng], {
        title: location.title,
        post_id: location.post_id,
        content: location.title + ' | ' + location.content.replace(/(<([^>]+)>)/gi, " ").replace(/\s\s+/g, " "),
        icon: L.icon({
          iconUrl: location.icon,
          iconSize: [26, 41],
          iconAnchor: [13, 41],
          popupAnchor: [0, -25],
          shadowUrl: marker_shadow_url,
          shadowSize: [41, 41],
          shadowAnchor: [13, 41]
        }),
        types: location.types || []
      });
      let popup = L.responsivePopup().setContent(location.content);
      marker.bindPopup(popup);
      oumAllMarkers.push(marker);
    });
  }

  // Use this to initialize markers and add them to the map initially
  function initializeMarkers() {
    addMarkers();  // Fill the oumAllMarkers array
    oumAllMarkers.forEach(marker => {
      oumMarkersLayer.addLayer(marker);  // Add all markers to the markers LayerGroup or ClusterGroup
    });
  }


  // VARIABLES

  const POPUP_MARKER_ID = getParameterByName('markerid');
  const REGION_ID = getParameterByName('region');
  const enableFullscreen = oum_enable_fullscreen ? true : false;
  const enableGestureHandlingMap = oum_enable_scrollwheel_zoom_map ? false : true;

  // Handle "Add Location" popup DOM placement on fullscreen mode
  const addLocationPopup = document.querySelector('#add-location-overlay');
  const originalContainer = addLocationPopup.parentElement;
  const fullscreenContainer = document.querySelector('.open-user-map .map-wrap');

  // Handle Location Bubble on small screens (show in fullscreen)
  const locationFullscreenContainer = document.querySelector('.open-user-map #location-fullscreen-container');

  // Handle "Locate My Position" service (should not run in parallel)
  var map_locate_process = false;
  var map2_locate_process = false;

  // SETUP MAIN MAP

  // Init Map
  const map = L.map(map_el, {
    gestureHandling: enableGestureHandlingMap,
    zoomSnap: 0.5,
    zoomDelta: 0.5,
    attributionControl: true,
    fullscreenControl: enableFullscreen,
    fullscreenControlOptions: {
      position: 'topleft',
      fullscreenElement: fullscreenContainer,
    }
  });

  map.attributionControl.setPrefix(false);

  // prevent moving/zoom outside main world bounds
  let world_bounds = L.latLngBounds(L.latLng(-60, -190), L.latLng(80, 190));
  let world_min_zoom = (map.getBoundsZoom(world_bounds) > 0) ? map.getBoundsZoom(world_bounds) : 1;
  map.setMaxBounds(world_bounds);
  map.setMinZoom(Math.ceil(world_min_zoom));
  map.on('drag', function() {
    map.panInsideBounds(world_bounds, { animate: false });
  });

  // make map reloadable (oumMap.invalidateSize()) after some preloader is ready
  oumMap = map;

  // Get Initial Map Bounds & Zoom
  let start_bounds = latLngToBounds(parseFloat(start_lat), parseFloat(start_lng), parseFloat(start_zoom), 570, 372);
  let start_bounds_zoom = map.getBoundsZoom(start_bounds);

  oum_minimum_zoom_level = oum_minimum_zoom_level ? oum_minimum_zoom_level : 1;

  if(oum_use_settings_start_location && !oum_has_regions) {

    // START POSITION FROM SETTINGS AND REGIONS ARE DISABLED

    // Make sure "Minimum zoom level" is lower than start zoom
    if(oum_minimum_zoom_level > parseFloat(start_zoom)) {
      oum_minimum_zoom_level = Math.floor(start_bounds_zoom);
    }

    // Set min zoom
    map.setMinZoom(oum_minimum_zoom_level);

  }else{

    // CUSTOM START POSITION 

    // Disable "Fixed Map Bounds" from Settings
    oum_enable_fixed_map_bounds = false;
  }

  // Render Map
  map.setView([start_lat, start_lng], start_bounds_zoom);

  // Bound map to fixed position
  if(oum_enable_fixed_map_bounds) { 
    map.setMaxBounds(map.getBounds().pad(0.1));
  }

  // Create Bounds Object needed for Marker Search
  let start_bounds_object = map.getBounds();

  // Set map style
  if (mapStyle == 'Custom1') {

    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}.png').addTo(map);
    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager_only_labels/{z}/{x}/{y}{r}.png', {
      tileSize: 512,
      zoomOffset: -1
    }).addTo(map);

  } else if (mapStyle == 'Custom2') {

    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}.png').addTo(map);
    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager_only_labels/{z}/{x}/{y}{r}.png', {
      tileSize: 512,
      zoomOffset: -1
    }).addTo(map);

  } else if (mapStyle == 'Custom3') {

    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}.png').addTo(map);
    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager_only_labels/{z}/{x}/{y}{r}.png', {
      tileSize: 512,
      zoomOffset: -1
    }).addTo(map);

  } else if (mapStyle == 'MapBox.streets') {

    L.tileLayer.provider('MapBox', {
      id: 'mapbox/streets-v12',
      accessToken: oum_tile_provider_mapbox_key
    }).addTo(map);

  } else if (mapStyle == 'MapBox.outdoors') {

    L.tileLayer.provider('MapBox', {
      id: 'mapbox/outdoors-v12',
      accessToken: oum_tile_provider_mapbox_key
    }).addTo(map);

  } else if (mapStyle == 'MapBox.light') {

    L.tileLayer.provider('MapBox', {
      id: 'mapbox/light-v11',
      accessToken: oum_tile_provider_mapbox_key
    }).addTo(map);

  } else if (mapStyle == 'MapBox.dark') {

    L.tileLayer.provider('MapBox', {
      id: 'mapbox/dark-v11',
      accessToken: oum_tile_provider_mapbox_key
    }).addTo(map);

  } else if (mapStyle == 'MapBox.satellite') {

    L.tileLayer.provider('MapBox', {
      id: 'mapbox/satellite-v9',
      accessToken: oum_tile_provider_mapbox_key
    }).addTo(map);

  } else if (mapStyle == 'MapBox.satellite-streets') {

    L.tileLayer.provider('MapBox', {
      id: 'mapbox/satellite-streets-v12',
      accessToken: oum_tile_provider_mapbox_key
    }).addTo(map);

  } else {
    // Default
    L.tileLayer.provider(mapStyle).addTo(map);
  }


  // ADD LOCATIONS

  let oumAllMarkers = []; // holds all markers
  let oumMarkersLayer; // Marker parent layer

  if (!oum_enable_cluster) {
    // clustering disabled
    oumMarkersLayer = L.layerGroup({
      chunkedLoading: true
    });
  } else {
    // clustering enabled
    oumMarkersLayer = L.markerClusterGroup({
      showCoverageOnHover: false,
      removeOutsideVisibleBounds: false,
      maxClusterRadius: 40,
      chunkedLoading: true
    });
  }

  // Add markers layer to map
  oumMarkersLayer.addTo(map);

  // Call this function initially to set up markers
  initializeMarkers();




  // ADD MAP CONTROLS

  // Control: search markers
  if (oum_enable_searchmarkers_button && (!oum_enable_searchbar || oum_searchbar_type !== 'markers')) {
    L.control.search({
      textPlaceholder: oum_searchmarkers_label,
      layer: oumMarkersLayer,
      propertyName: 'content',
      initial: false,
      buildTip: customAutoSuggestText,
      firstTipSubmit: true,
      autoCollapse: true, // resets search field
      zoom: oum_searchmarkers_zoom,
    }).addTo(map);
  }

  // Searchbar: search markers
  if (oum_enable_searchbar && oum_searchbar_type == 'markers') {
    L.control.search({
      container: 'oum_search_marker',
      collapsed: false,
      textPlaceholder: oum_searchmarkers_label,
      layer: oumMarkersLayer,
      propertyName: 'content',
      initial: false,
      buildTip: customAutoSuggestText,
      firstTipSubmit: true,
      autoCollapse: true, // resets search field
      zoom: oum_searchmarkers_zoom,
    }).addTo(map);
  }

  // Geosearch Provider
  switch (oum_geosearch_provider) {
    case 'osm':
      oum_geosearch_selected_provider = new GeoSearch.OpenStreetMapProvider();
      break;
    case 'geoapify':
      oum_geosearch_selected_provider = new GeoSearch.GeoapifyProvider({
        params: {
          apiKey: oum_geosearch_provider_geoapify_key
        }
      });
      break;
    case 'here':
      oum_geosearch_selected_provider = new GeoSearch.HereProvider({
        params: {
          apiKey: oum_geosearch_provider_here_key
        }
      });
      break;
    case 'mapbox':
      oum_geosearch_selected_provider = new GeoSearch.MapBoxProvider({
        params: {
          access_token: oum_geosearch_provider_mapbox_key
        }
      });
      break;
    default:
      oum_geosearch_selected_provider = new GeoSearch.OpenStreetMapProvider();
      break;
  }

  // Control: search address
  if (oum_enable_searchaddress_button && (!oum_enable_searchbar || oum_searchbar_type !== 'address')) {
    const searchControl = new GeoSearch.GeoSearchControl({
      style: 'button', //bar, button
      showMarker: false,
      provider: oum_geosearch_selected_provider,
      notFoundMessage: 'Sorry, that address could not be found.',
      searchLabel: oum_searchaddress_label,
      updateMap: false,
      autoComplete: true
    });
    map.addControl(searchControl);
  }

  // Searchbar: search address
  if (oum_enable_searchbar && oum_searchbar_type == 'address') {
    const searchControl = new GeoSearch.GeoSearchControl({
      style: 'bar', //bar, button
      showMarker: false,
      provider: oum_geosearch_selected_provider,
      searchLabel: oum_searchaddress_label,
      updateMap: false,
    });
    map.addControl(searchControl);
  }

  // Control: get current location
  if (oum_enable_currentlocation) {
    map_locate_process = L.control.locate({
      flyTo: true,
      showPopup: false
    }).addTo(map);
  }


  // EVENTS

  // Event: Enter Fullscreen
  map.on('enterFullscreen', function () {
    fullscreenContainer.appendChild(addLocationPopup);
  });

  // Event: Exit Fullscreen
  map.on('exitFullscreen', function () {
    originalContainer.appendChild(addLocationPopup);
  });

  // Event: Open Location Bubble
  map.on('popupopen', function(locationBubble){
    var el = locationFullscreenContainer;
    el.querySelector('.location-content-wrap').innerHTML = locationBubble.popup.getContent();
    locationFullscreenContainer.classList.add('visible');
    document.querySelector('body').classList.add('oum-location-opened');
  });

  // Event: Close Location Bubble
  map.on('popupclose', function(locationBubble){
    var el = locationFullscreenContainer;
    el.classList.remove('visible');
    document.querySelector('body').classList.remove('oum-location-opened');
    //map.setView(locationBubble.popup.getLatLng());
  });

  // Event: pan or zoom Map
  map.on('moveend', function(ev) {
    start_lat = map.getCenter().lat;
    start_lng = map.getCenter().lng;
    start_zoom = map.getZoom();
  });

  // Event: click on geosearch result
  map.on('geosearch/showlocation', function(e) {
    let coords = e.marker._latlng;
    let isInBounds = start_bounds_object.contains(coords);
    const searchBar = document.querySelector(`#${map_el} .leaflet-geosearch-bar form, #${map_el} .leaflet-geosearch-button form`);

    if(!isInBounds && oum_enable_fixed_map_bounds) {
      console.log('This search result is out of reach.');
      searchBar.style.boxShadow = "0 0 10px rgb(255, 111, 105)";
      setTimeout(function() {
        searchBar.style.boxShadow = "0 1px 5px rgba(255, 255, 255, 0.65)";
      }, 2000);
    }else{
      if(e.location.bounds !== null) {
        // Bounds exist for this search result
        map.flyToBounds(e.location.bounds);
      }else{
        if(e.location.raw.mapView) {
          // Here
          map.flyToBounds([
            [e.location.raw.mapView.south,e.location.raw.mapView.west],
            [e.location.raw.mapView.north,e.location.raw.mapView.east]
          ]);
        }else{
          // No Bounds available for this search result
          map.flyTo([e.location.y, e.location.x], 17);
        }
      }
    }
  });

  // Event: automatically open popup on ?markerid=123
  oumMarkersLayer.eachLayer(function(layer) {

    if(layer.options.post_id && layer.options.post_id === POPUP_MARKER_ID){

      map.setView(layer.getLatLng(), oum_searchmarkers_zoom);
      layer.openPopup();

    }
  });

  // Event: Change Region
  document.querySelectorAll('.open-user-map .change_region').forEach(function(btn) {
    btn.onclick = function(event) {
      let el = event.currentTarget;
      let region_lat = el.getAttribute('data-lat');
      let region_lng = el.getAttribute('data-lng');
      let region_zoom = el.getAttribute('data-zoom');

      let region_bounds = latLngToBounds(parseFloat(region_lat), parseFloat(region_lng), parseFloat(region_zoom), 570, 372);
      let region_bounds_zoom = map.getBoundsZoom(region_bounds);

      // Center Map
      map.flyTo([region_lat, region_lng], region_bounds_zoom);

      document.querySelectorAll('.open-user-map .change_region').forEach(function(el) {
        el.classList.remove('active');
      });
      el.classList.add('active');
    };

    // Event: Change Region on ?region=Europe
    if(btn.textContent == REGION_ID) {
      btn.click();
    }
  });

  // Event: Filter Markers
  document.querySelectorAll('.open-user-map .oum-filter-controls [name="type"]').forEach(input => {
    input.addEventListener('change', function() {

      // Update function to control visibility based on filters

      var checkedTypes = Array.from(document.querySelectorAll('.open-user-map .oum-filter-controls [name="type"]:checked')).map(input => input.value);
      console.log('Checked Types:', checkedTypes);
      
      oumAllMarkers.forEach(marker => {
        // Check if the marker has types defined and if it matches any of the checked types
        const hasTypes = marker.options.types && marker.options.types.length > 0;
        const matchesCheckedTypes = marker.options.types.some(type => checkedTypes.includes(type));
  
        if (hasTypes && matchesCheckedTypes) {
          // Marker has types and matches one of the checked types, ensure it's visible
          if (!map.hasLayer(marker)) {
            oumMarkersLayer.addLayer(marker);
          }
        } else if (hasTypes && !matchesCheckedTypes) {
          // Marker has types but does not match the checked types, hide it
          oumMarkersLayer.removeLayer(marker);
        } else {
          // Marker does not have types defined, it should always remain visible
          if (!map.hasLayer(marker)) {
            oumMarkersLayer.addLayer(marker);
          }
        }
      });
  
    });
  });

  
  // ADD LOCATION

  if (document.getElementById('open-add-location-overlay') != null) {
    //init form map
    const map2 = L.map('mapGetLocation', {
      attributionControl: false,
      gestureHandling: true,
      zoomSnap: 1,
      zoomDelta: 1,
      fullscreenControl: enableFullscreen,
      fullscreenControlOptions: {
        position: 'topleft'
      }
    });

    // Activate Map inside overlay
    (function() {

      let markerIsVisible = false;

      // Set map style
      if (mapStyle == 'Custom1') {

        L.tileLayer('https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}.png').addTo(map2);
        L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager_only_labels/{z}/{x}/{y}{r}.png', {
          tileSize: 512,
          zoomOffset: -1
        }).addTo(map2);

      } else if (mapStyle == 'Custom2') {

        L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}.png').addTo(map2);
        L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager_only_labels/{z}/{x}/{y}{r}.png', {
          tileSize: 512,
          zoomOffset: -1
        }).addTo(map2);

      } else if (mapStyle == 'Custom3') {

        L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}.png').addTo(map2);
        L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager_only_labels/{z}/{x}/{y}{r}.png', {
          tileSize: 512,
          zoomOffset: -1
        }).addTo(map2);

      } else if (mapStyle == 'MapBox.streets') {

        L.tileLayer.provider('MapBox', {
          id: 'mapbox/streets-v12',
          accessToken: oum_tile_provider_mapbox_key
        }).addTo(map2);

      } else if (mapStyle == 'MapBox.outdoors') {

        L.tileLayer.provider('MapBox', {
          id: 'mapbox/outdoors-v12',
          accessToken: oum_tile_provider_mapbox_key
        }).addTo(map2);

      } else if (mapStyle == 'MapBox.light') {

        L.tileLayer.provider('MapBox', {
          id: 'mapbox/light-v11',
          accessToken: oum_tile_provider_mapbox_key
        }).addTo(map2);

      } else if (mapStyle == 'MapBox.dark') {

        L.tileLayer.provider('MapBox', {
          id: 'mapbox/dark-v11',
          accessToken: oum_tile_provider_mapbox_key
        }).addTo(map2);

      } else if (mapStyle == 'MapBox.satellite') {

        L.tileLayer.provider('MapBox', {
          id: 'mapbox/satellite-v9',
          accessToken: oum_tile_provider_mapbox_key
        }).addTo(map2);

      } else if (mapStyle == 'MapBox.satellite-streets') {

        L.tileLayer.provider('MapBox', {
          id: 'mapbox/satellite-streets-v12',
          accessToken: oum_tile_provider_mapbox_key
        }).addTo(map2);

      } else {
        // Default
        L.tileLayer.provider(mapStyle).addTo(map2);
      }

      // Add searchbar: address
      const search = new GeoSearch.GeoSearchControl({
        style: 'bar',
        showMarker: false,
        provider: oum_geosearch_selected_provider,
        searchLabel: oum_searchaddress_label,
        updateMap: false,
      });
      map2.addControl(search);

      // Add control: get current location
      if (oum_enable_currentlocation) {
        map2_locate_process = L.control.locate({
          flyTo: true,
          showPopup: false
        }).addTo(map2);
      }

      //define marker

      // Marker Icon
      let markerIcon = L.icon({
        iconUrl: marker_icon_url,
        iconSize: [26, 41],
        iconAnchor: [13, 41],
        popupAnchor: [0, -25],
        shadowUrl: marker_shadow_url,
        shadowSize: [41, 41],
        shadowAnchor: [13, 41]
      });

      let locationMarker = L.marker([0, 0], {
        icon: markerIcon
      }, {
        'draggable': true
      });

      // move "Add Location"-Map to current Main map position
      start_lat = map.getCenter().lat;
      start_lng = map.getCenter().lng;
      start_zoom = map.getZoom();

      let main_map_width = document.querySelector(`#${map_el}`).offsetWidth;
      let main_map_height = document.querySelector(`#${map_el}`).offsetHeight;
      let start_bounds = latLngToBounds(parseFloat(start_lat), parseFloat(start_lng), parseFloat(start_zoom), main_map_width, main_map_height);
      let start_bounds_zoom = map2.getBoundsZoom(start_bounds);

      map2.setView([start_lat, start_lng], start_bounds_zoom);

      // prevent moving/zoom outside main world bounds
      map2.setMaxBounds(world_bounds);
      map2.setMinZoom(Math.ceil(world_min_zoom));
      map2.on('drag', function() {
        map2.panInsideBounds(world_bounds, { animate: false });
      });

      // Bound map to fixed position
      if(oum_enable_fixed_map_bounds) {  
        map2.setMaxBounds(map.getBounds());
      }

      //Event: click on map to set marker OR location found
      map2.on('click locationfound', function(e) {
        let coords = e.latlng;

        locationMarker.setLatLng(coords);

        if (!markerIsVisible) {
          locationMarker.addTo(map2);
          markerIsVisible = true;
        }

        setLocationLatLng(coords);
      });

      //Event: geosearch success
      map2.on('geosearch/showlocation', function(e) {
        let coords = e.marker._latlng;
        let label = e.location.label;
        let isInBounds = start_bounds_object.contains(coords);
        const searchBar = document.querySelector(`#mapGetLocation .leaflet-geosearch-bar form`);

        if(!isInBounds && oum_enable_fixed_map_bounds) {
          console.log('This search result is out of reach.');
          searchBar.style.boxShadow = "0 0 10px rgb(255, 111, 105)";
          setTimeout(function() {
            searchBar.style.boxShadow = "0 1px 5px rgba(255, 255, 255, 0.65)";
          }, 2000);
        }else{
          if(e.location.bounds !== null) {
            // Bounds exist for this search result
            map2.flyToBounds(e.location.bounds);
          }else{
            if(e.location.raw.mapView) {
              // Here
              map2.flyToBounds([
                [e.location.raw.mapView.south,e.location.raw.mapView.west],
                [e.location.raw.mapView.north,e.location.raw.mapView.east]
              ]);
            }else{
              // No Bounds available for this search result
              map2.flyTo([e.location.y, e.location.x], 17);
            }
          }
          
          locationMarker.setLatLng(coords);

          if (!markerIsVisible) {
            locationMarker.addTo(map2);
            markerIsVisible = true;
          }

          setLocationLatLng(coords);
          
          //setAddress(label);
        }
      });

      oumMap2 = map2;

      //Event: drag marker
      locationMarker.on('dragend', function(e) {
        setLocationLatLng(e.target.getLatLng());
      });

      //Validation for required checkbox groups
      jQuery('#oum_add_location input[type="submit"]').on('click', function() {
        let required_fieldsets = jQuery('#oum_add_location fieldset.is-required');

        required_fieldsets.each(function() {
          $cbx_group = jQuery(this).find('input:checkbox');
          $cbx_group.prop('required', true);
          if($cbx_group.is(":checked")){
            $cbx_group.prop('required', false);
          }
        });
      });

      //set lat & lng input fields
      function setLocationLatLng(markerLatLng) {
        console.log(markerLatLng);

        jQuery('#oum_location_lat').val(markerLatLng.lat);
        jQuery('#oum_location_lng').val(markerLatLng.lng);
      }

      //set address field
      function setAddress(label) {
        jQuery('#oum_location_address').val(label);
      }

    })();

    // Event: click on "+ Add Location" button
    document.getElementById('open-add-location-overlay').addEventListener('click', function(event) {

      // show overlay
      document.getElementById('add-location-overlay').classList.add('active');

      // prevent body scrolling
      document.querySelector('body').classList.add('oum-add-location-opened');

      // scroll to top of overlay
      window.scrollTo(0, document.getElementById('add-location-overlay').getBoundingClientRect().top + scrollY);

      //recalculate map size (due to overlay opening)
      map2.invalidateSize({animate: false});

      // stop locate process (main map)
      if(map_locate_process) {
        map_locate_process.stop();
      }

      // move "Add Location"-Map to current Main map position
      let main_map_width = document.querySelector(`#${map_el}`).offsetWidth;
      let main_map_height = document.querySelector(`#${map_el}`).offsetHeight;
      let start_bounds = latLngToBounds(parseFloat(start_lat), parseFloat(start_lng), parseFloat(start_zoom), main_map_width, main_map_height);

      // reposition map (wait for invalidateSize() to be ready)
      setTimeout(function() {
        map2.fitBounds(start_bounds);
      }, 300);

    });

    // Event: click on "notify on publish"
    if (document.getElementById('oum_location_notification') != null) {
      document.getElementById('oum_location_notification').addEventListener('change', function(event) {
        if (this.checked) {
          document.getElementById('oum_author').classList.add('active');
          document.getElementById('oum_location_author_name').required = true;
          document.getElementById('oum_location_author_email').required = true;
        } else {
          document.getElementById('oum_author').classList.remove('active');
          document.getElementById('oum_location_author_name').required = false;
          document.getElementById('oum_location_author_email').required = false;
        }
      });
    }

    // Events: close "Add location" overlay
    if (document.getElementById('close-add-location-overlay') != null) {
      
      // Event: Close "Add location" popup on X
      document.getElementById('close-add-location-overlay').addEventListener('click', function(event) {
        document.getElementById('add-location-overlay').classList.remove('active');

        // stop locate process (map2)
        if(map2_locate_process) {
          map2_locate_process.stop();
        }

        // allow body scrolling
        document.querySelector('body').classList.remove('oum-add-location-opened');
      });

      // Event: Close "Add location" popup on ESC key
      document.onkeydown = function(evt) {
        evt = evt || window.event;
        if(evt.key === "Escape") {
            document.getElementById('close-add-location-overlay').click();
        }
      };

      // Event: Close "Add location" popup on click on backdrop
      document.getElementById('add-location-overlay').addEventListener('click', function(event) {
        if (event.target !== this) return;
        document.getElementById('close-add-location-overlay').click();
      });
    }

    // Event: Remove uploaded image
    if (document.getElementById('oum_remove_image') != null) {
      document.getElementById('oum_remove_image').addEventListener('click', function() {        
        document.getElementById('oum_location_image').value = '';
        document.getElementById('oum_remove_existing_image').value = '1';
        document.getElementById('oum_location_image').nextElementSibling.classList.remove('active');
        document.getElementById('oum_location_image').nextElementSibling.querySelector('span').textContent = '';
      });
    }

    // Event: Remove uploaded audio
    if (document.getElementById('oum_remove_audio') != null) {
      document.getElementById('oum_remove_audio').addEventListener('click', function() {
        document.getElementById('oum_location_audio').value = '';
        document.getElementById('oum_remove_existing_audio').value = '1';
        document.getElementById('oum_location_audio').nextElementSibling.classList.remove('active');
        document.getElementById('oum_location_audio').nextElementSibling.querySelector('span').textContent = '';
      });
    }

    // Event: add another location
    if (document.getElementById('oum_add_another_location') != null) {
      document.getElementById('oum_add_another_location').addEventListener('click', function() {
        document.getElementById('oum_add_location').style.display = 'block';
        document.getElementById('oum_add_location_error').style.display = 'none';
        document.getElementById('oum_add_location_thankyou').style.display = 'none';
  
        //reposition map
        setTimeout(function() {
          map2.invalidateSize();
          map2.setView([start_lat, start_lng], start_zoom);
        }, 0);
  
        //reset media previews
        if(document.getElementById('oum_location_image')) {
          document.getElementById('oum_location_image').value = '';
          document.getElementById('oum_location_image').nextElementSibling.classList.remove('active');
          document.getElementById('oum_location_image').nextElementSibling.querySelector('span').textContent = '';
        }
  
        if(document.getElementById('oum_location_audio')) {
          document.getElementById('oum_location_audio').value = '';
          document.getElementById('oum_location_audio').nextElementSibling.classList.remove('active');
          document.getElementById('oum_location_audio').nextElementSibling.querySelector('span').textContent = '';
        }
      });
    }

    if(document.getElementById('oum_location_image') != null) {
      document.getElementById('oum_location_image').addEventListener('change', updatePreview);
    }

    if(document.getElementById('oum_location_audio') != null) {
      document.getElementById('oum_location_audio').addEventListener('change', updatePreview)
    }

    // Event: Edit Location (using event delegation)
    document.addEventListener('click', function(event) {
      // Check if the clicked element has the class 'edit-location-button'
      if (event.target.classList.contains('edit-location-button')) {
        let post_id = event.target.getAttribute('data-post-id');
        editLocation(post_id);
      }
    });

  }

  //execute custom JS from the settings here
  let oum_custom_js = Function(custom_js.snippet)();

}, false);
