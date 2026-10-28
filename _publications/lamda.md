---
title: Location Verification of Crowd-Sourced Sensors
authors: <b>Christopher Kitras</b>, Carter Pollan, Kyle Myers, Camille Wirthlin Tischner, Philip Lundrigan
venue: IEEE International Conference on Computer Communications and Networks (ICCCN), Honolulu, 2023
year: 2023
first_author: true
doi: 10.1109/ICCCN58024.2023.10230111
figure: assets/lamda.svg
link: assets/lambda.pdf
links:
- text: IEEE Xplore
  url: https://ieeexplore.ieee.org/document/10230111
  note: Published version
- text: Presentation
  url: assets/Location_Verification_of_Citizen_Science_Sensors.pdf
  note: ICCCN 2023 talk slides
- text: Code
  url: https://github.com/NET-BYU/LaMDA/tree/main
  note: Open source on GitHub
link_label: Paper
fig: lamda-latency
fig_aspect: 16/9
fig_label: A server exchanges ping messages with a phone and a sensor. When the sensor's traffic is relayed through a bridge, its latency rises far above the phone's and registration is rejected.
fig_caption: <strong>The latency check.</strong> The server pings the phone and the sensor ten times each and keeps the minimum round-trip time. On one network the two minimums agree to within the 15 ms tolerance. Turn on the bridge to relay the sensor through a cloud proxy, the attack we tested, and its latency jumps past the threshold. Packet timing is exaggerated so you can see it.
fig_illustrative: true
abstract: Community-driven sensor networks have been instrumental in providing easy access to affordable, large-scale measurement recording, facilitated by the accessibility of inexpensive sensor hardware. The simplicity of this hardware makes it challenging to retrieve trustworthy location data without added hardware such as GPS. We introduce the LaMDA framework, a software-based solution run solely in a web browser to determine the location of a device with the aid of a registering device. We monitor the device for any location changes by analyzing its traceroute data from a central server. Our solution allows minimal firmware changes to be made to fleets of devices without recall or changes to hardware.
---
