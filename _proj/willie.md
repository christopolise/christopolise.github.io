---
title: "WiLiE: Wireless LiDAR Explorer, a Cost-Effective Solution to Routine Network Metric Collection"
short_title: "WiLiE: coverage-mapping robot"
summary: "Commercial Wi-Fi survey tools are expensive and depend on a person walking around marking where they stand. WiLiE is a small robot built from commodity parts that maps a room with LiDAR and records signal strength as it drives."
authors: <b>Christopher Kitras</b>, Ashton Palacios
venue: "ECEN 526: Wireless Networking, Brigham Young University, 2022"
venue_short: "ECEN 526, BYU"
year: 2022
figure: assets/wilie.jpg
link: assets/WiLiE.pdf
link_label: "Read the report"
links:
  - text: "Presentation"
    url: assets/WiLiE_Presentation.pdf
    note: "Course presentation slides"
  - text: "Code"
    url: https://github.com/NET-BYU/WiLiE
    note: "ROS2 source on GitHub"
  - text: "Demo"
    url: https://www.youtube.com/watch?v=1Hk1gNweOpQ
    note: "Video"
fig_scripts: [wilie-survey]
short:
  - label: "The goal"
    text: "Make Wi-Fi signal-strength maps of a building without expensive survey tools or a person walking around marking where they are on a floor plan."
  - label: "What we built"
    text: "A remote-controlled robot made from Raspberry Pis, a microcontroller, and a low-cost LiDAR. It maps the room as it drives and tags each signal reading with where it was taken."
  - label: "How it went"
    text: "The robot drove a lab, placed readings to within about 50 cm, and produced heat maps that showed small pockets of weaker signal. A fair comparison with a commercial tool is still to be done."
---

## Why Wi-Fi surveys are hard

IT departments spend a lot of time chasing Wi-Fi problems that seem to appear only in certain parts of a room. The standard tool for finding them is a heat map of signal strength across a floor. Commercial products such as NetSpot and Ekahau make these maps; Ekahau is what BYU uses to design and debug its own network.

These tools share two limits. They are expensive, which puts them out of reach of small IT departments and individuals. And they depend on a person: someone walks the space with the equipment and marks on a map where they think they are standing. In practice that yields only one or two data points per room.

<aside>A research system from the Technical University of Sofia builds detailed 3D interference maps by moving a software-defined radio around a room on a fixed rig. It is accurate but has to be installed in the room it measures.</aside>

The Wireless LiDAR Explorer (WiLiE) is our attempt at a cheaper, more consistent alternative for a course project in ECEN 526, Wireless Networking: a robot built from commodity hardware that knows where it is, so it can take tens of readings in a single room and place each one accurately. Moving to the next room means driving there.

## Building the robot

We built WiLiE mostly from scratch, on a platform familiar to robot builders, so that others could reproduce and improve it. The parts:

- **Two Raspberry Pi 4Bs** as the main computers. One handles motor control and the LiDAR; the other measures signal strength and throughput.
- **A Teensy 4.1** microcontroller that reads the wheel encoders for odometry.
- **An RPLidar A1M8**, a low-cost spinning LiDAR, to map the surroundings.
- **A PlayStation 5 controller** over Bluetooth to drive.

The components talk through ROS2 (Robot Operating System 2), whose publish and subscribe model lets each part run as an independent node. The odometry node turns encoder counts into a position relative to the starting point. The motor node takes the controller's input and sets wheel speed and direction. The visualization node turns LiDAR readings into a live map in rviz2. The data collection node reads the signal strength (RSSI) that Linux reports for each wireless interface, and the localization node subscribes to it so each reading is matched to where the robot was.

Building it took longer than expected and pulled in a lot of disciplines at once. We designed the chassis in Fusion 360 and two custom circuit boards in EAGLE: a power board that steps 12 V down to several 5 V buses with low-cost buck converters, and a wheel encoder board. We learned how quadrature encoders work, computed odometry with a differential-drive model, and tuned the motor control for smooth, fairly consistent speed.

## Mapping while measuring

A survey run is simple from the operator's side: start the ROS2 nodes and drive. The LiDAR builds a map of the walls and furniture around the robot, the odometry tracks where it is on that map, and RSSI readings are logged continuously. Afterward, the readings are matched to positions, scaled to the map, and interpolated into a heat map.

{% include fig.html id="wilie-survey" aspect="16/9" illustrative=true label="A robot drives through a two-room floor plan. LiDAR rays sweep out from it and the walls appear as points where they hit. Signal-strength samples are dropped along its path and, when the drive ends, are blended into a heat map around the access point." caption="<strong>A survey drive.</strong> Only what the LiDAR has hit is drawn, so the map builds as the robot moves. Signal-strength samples drop along the path and are blended into a heat map at the end. Switch antennas to see the onboard antenna read the same field weaker. The floor plan, path, and signal field are made up; the two dB ranges on the legend are the ones measured in the project." %}

## What we found

We planned to survey the same space with both WiLiE and an Ekahau Sidekick, the commercial survey device, for a direct comparison. We surveyed the halls and some labs on the fourth floor of BYU's Engineering Building with the Ekahau. When we brought WiLiE and a separate router to the same floor, the router turned out to be faulty and WiLiE could not connect reliably to it or to the open networks, so we ran WiLiE's survey in our lab instead.

<dl class="results">
  <div><dt>accuracy of where each reading is placed</dt><dd>~50 cm</dd></div>
  <div><dt>RSSI range, external antenna</dt><dd>−59 to −17 dB</dd></div>
  <div><dt>RSSI range, onboard antenna</dt><dd>−74 to −30 dB</dd></div>
</dl>

In the lab, WiLiE produced heat maps from two radios: an external network adapter plugged into the Pi, and the Pi's onboard antenna. Readings were placed to within about 50 cm, and the maps showed micro-pockets where the signal was weaker than the area around them, the kind of detail a survey with one or two points per room would miss.

The comparison has clear limits, and the report states them. The two surveys were not in the same place, so no firm conclusion about accuracy against Ekahau is possible. WiLiE reads RSSI only from the access point it is connected to, while the Ekahau listens to every access point in monitor mode. And most of the post-processing, from matching readings to positions to rendering the heat map, was done by hand.

## What we'd change

The project showed the idea works more than it delivered a finished tool. The next version would redesign the chassis and electronics, and possibly emulate an Ekahau or use a software-defined radio for measurement. It would also drive itself, measure in three dimensions, put all of the robot's computers on one local network through a switch, and automate the pipeline from drive to heat map.

The broader takeaway is about cost. Professional survey tools are hard for small IT departments and individuals to buy and maintain. A robot that maps its own surroundings and collects many metrics automatically, built from open-source software and commodity parts, is a start toward putting that capability in more hands.
