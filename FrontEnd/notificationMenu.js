
export function togglePanel() {
    const panel = document.getElementById('notificationPanel');
    panel.classList.toggle('open');
}

function updateOrAddBubble(count) {
  let hamburger = document.getElementById("hamburger");
  let bubble = hamburger.querySelector('.bubble');
  if(count > 0) {
  if (bubble) bubble.textContent = count;
  else if (count !== null) hamburger.innerHTML += `<span class="bubble">${count}</span>`;
  } else {
    if(bubble) bubble.remove();
  }
}

export function addNotification(message, locationName, firewallInfo, OfflineUnifiDevices) {
    const panel = document.getElementById('notificationPanel');
    const notif = document.createElement('div');
    notif.className = 'notification';
    notif.locationName = locationName;
    const text = document.createElement('span');
    text.innerText = message;
    notif.appendChild(text);
    let html = ``;
    if (firewallInfo.statusStr !== 'Clear') {
        html += formatOpManObject(firewallInfo);
        notif.style.backgroundColor = "rgb(240, 174, 174)";
    }

    if(OfflineUnifiDevices.length !== 0) {
        if(html === ``) {
            html += formatUnifiDeviceList(OfflineUnifiDevices);
            notif.style.backgroundColor = "rgb(244, 247, 171)";
        } else {
            html += `<br>`;
            html += formatUnifiDeviceList(OfflineUnifiDevices);
        }
    }

    notif.onclick = () => {
        openModal(html);
    };

    panel.appendChild(notif);
    updateOrAddBubble(panel.children.length);
}

export function removeNotification(locationName) {
    const panel = document.getElementById('notificationPanel');
    const notifications = panel.getElementsByClassName('notification');
    for (const notif of notifications) {
        const text = notif.locationName;
        if (text === locationName) {
            notif.remove();
            break;
        }
    }

    updateOrAddBubble(panel.children.length);
}

export function openModal(message) {
    const modal = document.getElementById('notificationModal');
    const modalContent = document.getElementById('modalContent');
    modalContent.innerHTML = message;
    modal.style.display = 'flex';
}

export function closeModal() {
    const modal = document.getElementById('notificationModal');
    modal.style.display = 'none';
}

// Helper function to escape HTML special characters
function escapeHtml(text) {
  if (typeof text !== 'string') text = String(text);
  return text.replace(/&/g, "&amp;")
              .replace(/</g, "&lt;")
              .replace(/>/g, "&gt;")
              .replace(/"/g, "&quot;")
              .replace(/'/g, "&#039;");
}

//filter and create Op Manager device info
function formatOpManObject(jsonObject) {
  const fieldMap = {
    statusStr: 'status',
     displayName: 'name',
     ipaddress: 'IP address'
  };

  // This is an accumulator. We have this to rename the keys.
  const filteredObject = Object.keys(fieldMap).reduce((obj, key) => {
    if (jsonObject[key] !== undefined) {
      obj[fieldMap[key]] = jsonObject[key];
    }
    return obj;
  }, {});

  let html = `
    <div style="font-family: Arial, sans-serif; padding: 15px; background:rgb(240, 174, 174); border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); max-width: 300px;">
      <h3 style="margin: 0 0 10px; font-size: 18px; color: #333;">Firewall</h3>
  `;
  for (const [key, value] of Object.entries(filteredObject)) {
    const isStatus = key === 'status';
    const color = isStatus && value === 'Clear' ? 'green' : isStatus ? 'red' : '#333';
    html += `
      <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
        <strong style="color: rgb(0, 0, 0); text-transform: capitalize;">${key}:</strong>
        <span style="color: ${color};">${value}</span>
      </div>
    `;
  }
  html += `</div>`;

  return html;
}

// formats the message for openModal
function formatUnifiDeviceList(deviceList) {
  const fieldMap = {
    model: 'Model',
    macAddress: 'MAC Address',
    ipAddress: 'IP Address',
    state: 'State'
  };

    let html = ``;
    
    deviceList.forEach((jsonObject) => {
        html += '<div style="font-family: Arial, sans-serif; font-size: 14px; padding: 15px; background:rgb(244, 247, 171); border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); max-width: 300px;">';        
        html += `<strong>${jsonObject.name}</strong>`;

        // This is an accumulator. We have this to rename the keys. Grabs the values from jsonObject and assigns them to the keys in fieldMap
        const filteredObject = Object.keys(fieldMap).reduce((obj, key) => {
            if (jsonObject[key] !== undefined) {
                obj[fieldMap[key]] = jsonObject[key];
            }
            return obj;
        }, {});

        Object.entries(filteredObject).forEach(([key, value]) => {
            if (key !== 'id' && key !== 'name' && key !== 'features' && key !== 'interfaces') {
                html += `<div><strong>${key}:</strong> ${escapeHtml(value)}</div>`;
            }
        });

        html += `</div>`; 
        html += `<br>`;
    });
  
    //html += '</div>';

    return html;
}

window.togglePanel = togglePanel;
window.closeModal = closeModal;