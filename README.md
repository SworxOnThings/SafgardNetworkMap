# Network Map for Saf-Gard Safety Shoes
This is a repository that contains the code for the Saf-Gard Safety Shoes internal network map. The goal is to create a map that contains markers which indicate the locations of Saf-Gard installed and maintained network equipment. Each device at any given location contains:
- name
- status
- IP address 

The device list for all locations will contain a firewall, a switch (potentially multiple), and wireless access points. 
Finally, a notification panel is included that contains all devices that are experiencing issues and their respective locations.

## Why this map was created
To add an additional, more immediate layer of network visibility.

## How it works
The initial view presents all of the Saf-Gard locations on a geographical map marked by an AdvancedMarker. A reference photo has been included in the **Photos** section, named *Initial View*.

When clicked, an AdvancedMarker for any location will pop up an InfoWindow. The InfoWindow will contain a section that displays the status of the Firewall, along with three buttons. Each of those buttons will toggle the *Device Panel*, as shown in the **Photos** section, and populate the panel with network information. The three buttons are for Firewall information, Unifi Switch Information, and Unifi Wireless Access Point information. 

The network information for each respective device is gathered from the APIs provided by OpManager and Unifi Site Manager. 

Upon encountering an error with one of the devices for a location, the AdvancedMarker will change colors to reflect the state of the location. The Color Code is:
- <span style="color:red">*Red*</span>: indicating an error with the firewall
- <span style="color:yellow">*Yellow*</span>: indicating an error with any Unifi device
- <span style="color:green">*Green*</span>: no errors. Location fully visibile.


To the right of the screen, a hamburger menu is present, as seen in the photo *Notification Panel*. This menu may or may not display a bubble to the top right, depending on the state of every device tracked by this map. If a network device is down, then the bubble will display a count on top of the hamburger menu. When clicked, the hamburger menu toggles the *Notification Panel*. This panel contains each of the locations that have devices currently in an error state. (indicated by red or yellow) In the Notification Panel, each location will take the form of a clickable card. When clicked, the card will then pop up a modal window on the screen which contains each device at that specific location in an error state. Each device is color coded, according to the color coding schema above.

## Photos

Initial View
![Initial View](https://github.com/SworxOnThings/SafgardNetworkMap/blob/main/SafgardNetworkMapPhotos/WideShot.png)

