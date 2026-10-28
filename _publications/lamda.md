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
fig: lamda-pipeline
fig_aspect: 16/9
fig_label: "The LaMDA pipeline in three stages. Registration: a server pings a phone and a sensor and accepts when their minimum latencies agree within 15 ms. Signature: traceroutes from the server to the sensor's home router, repeated over a week, build a weighted graph of hops across the server's host, transit and home ISP networks. Detection: after a gap in data, new traces are laid over the signature and scored against a 90 percent threshold."
fig_caption: "<strong>From registration to a moved sensor.</strong> The server first checks that the sensor's latency matches the owner's phone to within 15 ms. It then traceroutes the sensor's home router every 10 minutes for a week: links it sees often grow thicker and load-balanced detours branch off, leaving a weighted path graph that is the sensor's signature. After a gap in uploads, new traces are scored against it, 99.7% if the sensor stayed or 11.3% after a move between cities (Table I(b)), against the 90% threshold. Use the button to keep the sensor in place or move it; the hop graph, latencies and timing are illustrative."
fig_illustrative: true
abstract: Community-driven sensor networks have been instrumental in providing easy access to affordable, large-scale measurement recording, facilitated by the accessibility of inexpensive sensor hardware. The simplicity of this hardware makes it challenging to retrieve trustworthy location data without added hardware such as GPS. We introduce the LaMDA framework, a software-based solution run solely in a web browser to determine the location of a device with the aid of a registering device. We monitor the device for any location changes by analyzing its traceroute data from a central server. Our solution allows minimal firmware changes to be made to fleets of devices without recall or changes to hardware.
---
