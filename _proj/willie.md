---
title: 'WiLiE: Wireless LiDAR Explorer, a Cost-Effective Solution to Routine Network Metric Collection'
authors: <b>Christopher Kitras</b>, Ashton Palacios
venue: 'ECEN 526: Wireless Networking, Brigham Young University, 2022'
year: 2022
figure: assets/wilie.jpg
link: assets/WiLiE.pdf
links:
- text: Presentation
  url: assets/WiLiE_Presentation.pdf
  note: Course presentation slides
- text: Code
  url: https://github.com/NET-BYU/WiLiE
  note: ROS2 source on GitHub
- text: Demo
  url: https://www.youtube.com/watch?v=1Hk1gNweOpQ
  note: Video
link_label: Report
fig: wilie-survey
fig_aspect: 16/9
fig_label: A robot drives through a two-room floor plan. LiDAR rays sweep out from it and the walls appear as points where they hit. Signal-strength samples are dropped along its path and, when the drive ends, are blended into a heat map around the access point.
fig_caption: <strong>A survey drive.</strong> Only what the LiDAR has hit is drawn, so the map builds as the robot moves. Signal-strength samples drop along the path and are blended into a heat map at the end. Switch antennas to see the onboard antenna read the same field weaker. The floor plan, path, and signal field are made up; the two dB ranges on the legend are the ones measured in the project.
fig_illustrative: true
about: Commercial Wi-Fi survey tools are expensive and depend on a person walking a floor plan and marking where they stand. WiLiE is a remote-controlled robot built from Raspberry Pis, a microcontroller and a low-cost LiDAR that maps the room as it drives and tags every signal-strength reading with where it was taken. In a lab test it placed readings to within about 50 cm and produced heat maps that showed small pockets of weaker signal.
---
