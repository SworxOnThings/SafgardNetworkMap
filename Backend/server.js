import fetch from 'node-fetch';
import express from 'express';
import cors from 'cors';
import https from 'https';
import fs from 'fs';

const app = express();
const PORT = 3000;

const baseUnifiURI = 'https://2274cca2-a188-412f-b66d-ed13543835f3.unifi-hosting.ui.com/proxy/network/integration/v1';
const baseOpManURI = 'https://opmanager:8061';
const sitesURI = `${baseUnifiURI}/sites`;

const apiKeyMap = createMap('c:\\SafgardNetworkMap\\Backend\\Keys.txt');
const locations = buildLocationsArray('c:\\SafgardNetworkMap\\Backend\\locations.txt');

const siteFirewallMap = createMap('c:\\SafgardNetworkMap\\Backend\\FirewallMap.txt');
const unifiLocationsMap = createMap('c:\\SafgardNetworkMap\\Backend\\unifiNameMap.txt');
const siteNameToSiteID = new Map();

app.use(cors());

async function sendRequestWithHeaders(URI, headers) {
  const response = await fetch(URI, {
    method: 'GET',
    headers: headers
  });

  return response;
}

//opManager
async function sendOpManRequest(URI) {
  const opManAPIKey = apiKeyMap.get('opManAPIKey');
  const headers = {
    'apiKey': opManAPIKey,
  }

  const agent = new https.Agent({ rejectUnauthorized: false}); 
  const options = {
    method: 'GET',
    headers: headers,
    agent: agent
  }

  return await fetch(URI, options);
}

//unifi
async function sendUnifiRequest(URI) {
  const unifiAPIKey = apiKeyMap.get('unifiAPIKey');
  const headers = {
        'X-API-KEY': unifiAPIKey,
        'Accept': 'application/json'
  }

  const response = await sendRequestWithHeaders(URI, headers);
  return response;
}


async function fetchData(URI, sendRequestFunc, res) {
  try {

    const response = await sendRequestFunc(URI);
    const data = await response.json();

    res
      .status(response.status)
      .contentType(response.headers.get('content-type'))
      .send(data);
  } catch (err) {
    console.log(`Failed to fatch from target URI: ${URI}`, err);
    res.status(500).json({ error: 'Failed to fetch target data' });
  }
}


async function fetchOpManData(URI, res) {
  await fetchData(URI, sendOpManRequest, res);
}

async function fetchUnifiData(URI, res) {
  await fetchData(URI, sendUnifiRequest, res);
}

function createMap(filepath) {
  const map = new Map();
  fs.readFileSync(filepath, 'utf8').split('\n').forEach(line => {
    const [key, value] = line.split(':').map(str => str.trim());
    if(key && value){
      map.set(key, value);
    }
  });

  return map;
}

function buildLocationsArray(filepath) {
  const content = fs.readFileSync(filepath, 'utf-8');
  const jsonObjects = {};
  content.split('\n').forEach(line => {
    const match = line.match(/const\s+(\w+)\s*=\s*({.*});/);
    if (match) {
      const varName = match[1];
      let jsonStr = match[2];
      jsonStr = jsonStr.replace(/'/g, '"');
      jsonStr = jsonStr.replace(/([{,]\s*)(\w+)(\s*:)/g, '$1"$2"$3');
      jsonObjects[varName] = JSON.parse(jsonStr);
    }
  });

  const jsonArray = Object.values(jsonObjects);
  console.log(jsonArray);
  return jsonArray;
}

function mapUnifiNameToSiteName(unifiName) {
  return unifiLocationsMap.get(unifiName);
}

function setSiteMap(data) {
  for (const item of data.data) {
    const unifiName = item.name;
    const site = mapUnifiNameToSiteName(unifiName);
    siteNameToSiteID.set(site, item.id);
  }
}

app.get('/locations', async(_req, res) => {
  res.json(locations); 
});

//opManager devices call
app.get('/devices/opmanager', async(req, res) => {
  let firewallName = siteFirewallMap.get(req.query.locationName);
  if(!firewallName) {
    console.log(`No firewall for location ${req.query.locationName}`);
    res.status(404).send(`location ${req.query.locationName} not found.`);
    return;
  }
  const opManDevicesURI = `${baseOpManURI}/api/json/device/listDevices`;
  await fetchOpManData(`${opManDevicesURI}?category=Firewall&deviceName=${firewallName}`, res);
});

//unifi call
app.get('/devices/unifi', async(req, res) => {
  let siteID = siteNameToSiteID.get(req.query.locationName);
  if (!siteID) {
    const response = await sendUnifiRequest(`${sitesURI}?limit=200`);
    const data = await response.json();
    console.log(`this is what unifi responded with ${JSON.stringify(data)}`);
    setSiteMap(data);
  }
  
  siteID = siteNameToSiteID.get(req.query.locationName);
  console.log(`This is the siteID: ${req.query.locationName}`);
  if (siteID) {
    const devicesURI = `${sitesURI}/${siteID}/devices?limit=200`;
    await fetchUnifiData(devicesURI, res);
  } else {
    res.status(404).send(`siteID ${siteID} not found`);
  }
});


app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
