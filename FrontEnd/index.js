"use strict";
/*
 * @license
 * Copyright 2025 Google LLC. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { addNotification, removeNotification} from "./notificationMenu.js";
import {addDevicePanel, refreshDevicePanel, removeDevicePanel} from "./DevicePanel.js";

let map;
let infoWindow;

let locations = [];

const siteToDeviceMap = new Map(); 
const locationToFirewall = new Map(); 
const locationNameToMarker = new Map();

const baseURI = `http://localhost:3000`;
const locationsURI = `${baseURI}/locations`;
const unifiDevicesURI = `${baseURI}/devices/unifi`;
const opManDevicesURI = `${baseURI}/devices/opmanager`;

let currentLocation = null;
let deviceKind = null; 


const firewallOnlineStatus = new Map();
const offlineUnifiDevicesByLocation = new Map(); 

const intervalMs = 10 * 60 * 1000;



function formatDeviceList(deviceList, deviceKind) {
  let html = ``;

    deviceList.sort((deviceObj1, deviceObj2) => {
      const stateA = (deviceObj1.state || '').toUpperCase();
      const stateB = (deviceObj2.state || '').toUpperCase();
      const OFFLINE = 'OFFLINE';
      if (stateA === stateB) return deviceObj1.name.localeCompare(deviceObj2.name);
      return stateA === OFFLINE ? -1 : 1;
    });

  deviceList.forEach((obj) => {
    if(obj.features.includes(deviceKind)){
        html += `<div style="font-family: Arial, sans-serif; padding: 15px; background:rgb(255, 255, 255); border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); max-width: 300px;">`;
        html += `<strong>${obj.name}</strong>`;
    
        if (obj.state) html += `<div><strong>State:</strong> ${escapeHtml(obj.state.toUpperCase())}</div>`;
        if (obj.ipAddress) html += `<div><strong>IP address:</strong> ${escapeHtml(obj.ipAddress)}</div>`;
        if (obj.macAddress) html += `<div><strong>MAC address:</strong> ${escapeHtml(obj.macAddress)}</div>`;
    
        html += `</div>`;
        html += `<br>`;
      } 
    });

    html += createCloseButton();
    html += `<br>`;
    return html;
}
  
function escapeHtml(text) {
  if (typeof text !== 'string') text = String(text);
  return text.replace(/&/g, "&amp;")
              .replace(/</g, "&lt;")
              .replace(/>/g, "&gt;")
              .replace(/"/g, "&quot;")
              .replace(/'/g, "&#039;");
}
   
function createCloseButton() {
  return `<div><button id="closeUnifiButton" class="device-button">Close</button></div>`;
}

function formatOpManObject(jsonObject) {
  const fieldMap = {
    statusStr: 'status',
  };

  const filteredObject = Object.keys(fieldMap).reduce((obj, key) => {
    if (jsonObject[key] !== undefined) {
      obj[fieldMap[key]] = jsonObject[key];
    }
    return obj;
  }, {});

  let html = `
    <div style="font-family: Arial, sans-serif; padding: 15px; background: #f9f9f9; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); max-width: 300px;">
      <h3 style="margin: 0 0 10px; font-size: 18px; color: #333;">Firewall</h3>
  `;
  for (const [key, value] of Object.entries(filteredObject)) {
    const isStatus = key === 'status';
    const color = isStatus && value === 'Clear' ? 'green' : isStatus ? 'red' : '#333';
    html += `
      <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
        <strong style="color: #555; text-transform: capitalize;">${key}:</strong>
        <span style="color: ${color};">${value}</span>
      </div>
    `;
  }
  html += `</div>`;

  return html;
}

function formatOpManObjForDevicePanel(opManObj) {
  const { displayName, ipaddress } = opManObj;
  return `
    <div style="font-family: Arial, sans-serif; padding: 8px; background: #f9f9f9; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); max-width: 300px;">
      <h3 style="margin: 0 0 10px; font-size: 18px; color: #333; text-align: center;">Firewall</h3>
      <p><strong>Name:</strong> ${displayName}</p>
      <p><strong>IP Address:</strong> ${ipaddress}</p>
    </div>
    <br>
    <div><button id="closeUnifiButton" class="device-button">Close</button></div>
  `;
}

function createInfoWindowHTML(siteName) {
  const contentDiv = document.createElement('div');
  contentDiv.id = 'content';
  contentDiv.style.display = 'flex';
  contentDiv.style.flexDirection = 'column';
  contentDiv.style.gap = '10px';
  const heading = document.createElement('h1');
  heading.style.marginTop = '1px';
  heading.id = 'siteName';
  heading.className = 'siteName';
  heading.textContent = `${siteName}`;
  heading.style.textAlign = 'center';
  contentDiv.appendChild(heading);

  //opManager HTML
  let firewallObj = locationToFirewall.get(/*refers to locationName*/ siteName);
  const firewallDiv = document.createElement('div');
  const firewallHTML = formatOpManObject(firewallObj);
  firewallDiv.innerHTML = firewallHTML;
  contentDiv.appendChild(firewallDiv);

  //firewall HTML button
  const firewallButton = document.createElement('button');
  firewallButton.id = 'firewallButton';
  firewallButton.className = 'device-button';
  firewallButton.textContent = 'Show Firewall Information';
  contentDiv.appendChild(firewallButton);

  //unifi switch HTML button
  const switchButton = document.createElement('button');
  switchButton.id = 'switchButton';
  switchButton.className = 'device-button';
  switchButton.textContent = 'Show Unifi Switch Information';
  contentDiv.appendChild(switchButton);

  //unifi Access Point HTML button
  const apButton = document.createElement('button');
  apButton.id = 'AccessPointButton';
  apButton.className = 'device-button';
  apButton.textContent = 'Show Unifi Access Point Information';
  contentDiv.appendChild(apButton);

  return {content: contentDiv, firewallButton: firewallButton, switchButton: switchButton, apButton: apButton};
}

function updateInfoWindow(content, center, marker) {
    infoWindow.setContent(content);
    infoWindow.setPosition(center);
    infoWindow.open({
        map,
        anchor: marker,
        shouldFocus: false,
    });
}

async function fetchData(uri, handleResponse) {
    try {
        const response = await fetch(uri, {
            method: 'GET',
            headers: {
                'Accept': 'application/json'
            }
        });

        if(!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }

        const data = await response.json();
        handleResponse(data);
    } catch (error) {
        console.error('Fetch error: ', error);
    }
}

function getOfflineUnifiDevices(deviceList) {
  return deviceList.filter((device) => { return device.state.toUpperCase() === 'OFFLINE'; });
}

async function updateMarker(locationName) {
  const firewallStatus = firewallOnlineStatus.get(locationName);
  const offlineUnifiDevices = offlineUnifiDevicesByLocation.get(locationName);
  const isUnifiDeviceOffline = offlineUnifiDevices.length !== 0;
  if(!firewallStatus) {
    const pinGlyph = new google.maps.marker.PinElement({
        background: '#FF0000',
        borderColor: 'red',
        glyphColor: '#DC143C',
        scale: 0.5
    });
    locationNameToMarker.get(locationName).content = pinGlyph.element; // FIREWALL OFFLINE
  }
  else if(isUnifiDeviceOffline) {
    const pinGlyph = new google.maps.marker.PinElement({
        background: '#FFFF00',
        borderColor: 'yellow',
        glyphColor: '#DC143C',
        scale: 0.5
    });
    locationNameToMarker.get(locationName).content = pinGlyph.element; //UNIFI DEVICE OFFLINE
  }
  else {
    const pinGlyph = new google.maps.marker.PinElement({
        background: '#00FF00',
        borderColor: 'green',
        glyphColor: '#006400',
        scale: 0.5
    });
    locationNameToMarker.get(locationName).content = pinGlyph.element; //ONLINE
  }
}

async function updateNotificationMenu(locationName, isFirewallOffline, isUnifiDeviceOffline, offlineUnifiDevices) {
  removeNotification(locationName);
  const firewallInfo = locationToFirewall.get(locationName);
  if(isFirewallOffline && isUnifiDeviceOffline) {
    addNotification(`Firewall and Unifi devices offline at ${locationName}`, locationName, firewallInfo, offlineUnifiDevices);
  }
  else if(isFirewallOffline) {
    addNotification(`Firewall is offline at ${locationName}`, locationName, firewallInfo, offlineUnifiDevices);
  }
  else if( isUnifiDeviceOffline) {
    addNotification(`Unifi device(s) are offline at ${locationName}`, locationName, firewallInfo, offlineUnifiDevices);
  }
}

//opManager devices
async function requestUpdateFirewallInfo(locationName) {
  await fetchData(`${opManDevicesURI}?locationName=${locationName}`, (opManArray) => {
    if(opManArray.length === 1) {
      locationToFirewall.set(locationName, opManArray[0]);
      const firewallStatus = opManArray[0].statusStr;
      firewallOnlineStatus.set(locationName, firewallStatus === 'Clear');

      if(locationName === currentLocation) {
        const {content, firewallButton, switchButton, apButton} = createInfoWindowHTML(locationName);
        registerButtonCallBacks(locationName, firewallButton, switchButton, apButton);
        const site = locations.find(location => location.name === locationName);
        const marker = locationNameToMarker.get(locationName);
        updateInfoWindow(content, site.location, marker);
      }
    } else {
      console.log(`Op Manager response array for ${locationName} greater than one.`);
    }
  });
}

function updateDevicePanel(locationName){
  if(deviceKind === 'firewall'){
    let firewallObj = locationToFirewall.get(locationName);
    refreshDevicePanel(formatOpManObjForDevicePanel(firewallObj));
  } else {
    const content = formatDeviceList(siteToDeviceMap.get(locationName), deviceKind);
    refreshDevicePanel(content);
  }
}

//unifi devices
async function requestUnifiDeviceInfo(siteName) {
  console.log(`Requesting device info at ${new Date().toISOString()}`);
  await fetchData(`${unifiDevicesURI}?locationName=${siteName}`, (data) => {
    siteToDeviceMap.set(siteName, data.data);
    if(currentLocation === siteName) {
      updateDevicePanel(siteName);
      document.getElementById('closeUnifiButton').addEventListener('click', () => { // everytime you refresh devicePanel you must register the close button
        removeDevicePanel();
      });
    }

    const OfflineDevices = getOfflineUnifiDevices(data.data);
    offlineUnifiDevicesByLocation.set(siteName, OfflineDevices);
  });
}

async function requestLocationInfo(locationName) {
  await requestUnifiDeviceInfo(locationName); //unifi
  await requestUpdateFirewallInfo(locationName); //opManager
  updateMarker(locationName);
  const offlineUnifiDevices = offlineUnifiDevicesByLocation.get(locationName);
  const isUnifiDeviceOffline = offlineUnifiDevices.length !== 0; // boolean
  const isFirewallOffline = !firewallOnlineStatus.get(locationName); // boolean
  updateNotificationMenu(locationName, isFirewallOffline, isUnifiDeviceOffline, offlineUnifiDevices);
}

async function requestDeviceList() {
    for (const location of locations) {
      await requestLocationInfo(location.name);
    }
}

function registerButtonCallBacks(locationName, firewallButton, switchButton, apButton){
  firewallButton.addEventListener('click', async () => {
    console.log("firewall button clicked");
    deviceKind = 'firewall';
    await requestLocationInfo(locationName);
    let firewallObj = locationToFirewall.get(locationName);
    addDevicePanel(formatOpManObjForDevicePanel(firewallObj));
    document.getElementById('closeUnifiButton').addEventListener('click', () => {
      console.log("close button clicked");
      removeDevicePanel();
    });
  });

  switchButton.addEventListener('click', async () => {
    console.log("Switch button clicked");
    deviceKind = 'switching';
    await requestLocationInfo(locationName);
    addDevicePanel(formatDeviceList(siteToDeviceMap.get(locationName), deviceKind));
    document.getElementById('closeUnifiButton').addEventListener('click', () => {
      console.log("close button clicked");
      removeDevicePanel();
    });
  });

  apButton.addEventListener('click', async () => {
    console.log("Access Point button clicked");
    deviceKind = 'accessPoint';
    await requestLocationInfo(locationName);
    addDevicePanel(formatDeviceList(siteToDeviceMap.get(locationName), deviceKind));
    document.getElementById('closeUnifiButton').addEventListener('click', () => {
      console.log("close button clicked");
      removeDevicePanel();
    });
  });
}

async function initMap() {
    // Request needed libraries.
    //@ts-ignore
    const [{ Map }, { AdvancedMarkerElement, PinElement }] = await Promise.all([
        google.maps.importLibrary("marker"),
        google.maps.importLibrary("places"),
    ]);
    // Initialize the map.
    map = new google.maps.Map(document.getElementById('map'), {
        center: locations.find(obj => obj.name === 'Greensboro').location,
        zoom: 4,
        mapId: '4504f8b37365c3d0',
        mapTypeControl: false,
    });
    

    infoWindow = new google.maps.InfoWindow({});
    
    infoWindow.addListener('closeclick', () => {
      currentLocation = null;
      removeDevicePanel();
    });

    locations.forEach((safgardLocation) => {
        const pinGlyph = new google.maps.marker.PinElement({
            background: '#00ff00',
            borderColor: 'green',
            glyphColor: '#006400',
            scale: 0.5
        });

        const marker = new google.maps.marker.AdvancedMarkerElement({
            map: map,
            position: safgardLocation.location,
            content: pinGlyph.element
        });


        marker.addListener("gmp-click", async () => {
          currentLocation = safgardLocation.name;
          await requestLocationInfo(safgardLocation.name);
          updateDevicePanel(safgardLocation.name);
          document.getElementById('closeUnifiButton').addEventListener('click', () => {
            console.log("close button clicked");
            removeDevicePanel();
          });
        });

        locationNameToMarker.set(safgardLocation.name, marker);
    }); 
}

function initOfflineUnifiDevicesByLocationMap(){
  for(const location of locations) {
    offlineUnifiDevicesByLocation.set(location.name, []);
  }
}

function initSiteToDeviceMap() {
  for(const location of locations){
    siteToDeviceMap.set(location.name, []);
  }
}

async function initLocationsArray() {
  await fetchData(locationsURI, (locationArray) => {
    locations = locationArray;
  });
}


async function callFunctions() {
    await initLocationsArray();
    initSiteToDeviceMap();
    initOfflineUnifiDevicesByLocationMap();
    await initMap();
    await requestDeviceList();
    setInterval(requestDeviceList, intervalMs);
}

callFunctions();