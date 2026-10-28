---
title: 'TCAM: Traffic Camera Air quality Monitoring'
authors: <b>Christopher Kitras</b>, Carter Pollan, Janie Linford, Philip Lundrigan
venue: 'Air Quality: Science for Solutions (S4S), 2025'
year: 2025
first_author: true
figure: assets/s4s2025_thumb.png
link: assets/S4S-2025.pdf
link_label: Poster
fig: tcam-dashboard
fig_aspect: 16/9
fig_label: A recreation of TCAM's dark map dashboard of Utah Valley around Utah Lake, with dots for traffic cameras, PurpleAir sensors, DAQ stations and a weather station. A 5 km selection circle settles over Provo, the query panel below fills in coordinates, sources and the 2021 to 2025 date range, the sources inside the circle are counted, and one camera inside opens as a frame that the model assigns to an air-quality category.
fig_caption: '<strong>The TCAM data dashboard.</strong> As on the poster''s dashboard, a 5 km radius at Provo selects the traffic cameras, PurpleAir sensors, DAQ stations and weather stations inside it, and one camera''s frame goes to the YOLO-cls model, which picked the right air-quality category 98.6% of the time on one camera. Toggle the source layers, move the radius to another town, or click the map. The map, station positions and Provo query follow the poster''s screenshot; camera and PurpleAir positions are a synthetic sample of the 1,395 cameras and 778 sensors, so the in-radius counts count that sample, and the camera frame and its category are synthetic.'
fig_illustrative: true
about: Air-quality readings come from a limited number of stations and privately bought sensors, which cluster where people can afford them. TCAM pairs years of images from Utah's public traffic cameras with hourly PM2.5 readings to estimate air quality from the picture alone. We collected over 218 million images from 1,395 cameras, and in a first test on one camera the model picked the right air-quality category 98.6% of the time.
---
