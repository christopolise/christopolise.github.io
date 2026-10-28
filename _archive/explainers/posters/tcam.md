---
title: "TCAM: Traffic Camera Air quality Monitoring"
short_title: "TCAM: air quality from cameras"
summary: "Air-quality coverage depends on how many stations and sensors happen to be nearby. TCAM uses Utah's public traffic cameras, which already cover far more ground, to estimate air quality from the image itself."
authors: <b>Christopher Kitras</b>, Carter Pollan, Janie Linford, Philip Lundrigan
venue: "Air Quality: Science for Solutions (S4S), 2025"
venue_short: "S4S 2025"
bib_venue: "Air Quality: Science for Solutions (S4S)"
year: 2025
area: sensing
first_author: true
figure: assets/s4s2025_thumb.png
link: assets/S4S-2025.pdf
link_label: "View the poster"
fig_scripts: [tcam-label]
short:
  - label: "The problem"
    text: "Air-quality readings come from a limited number of government stations and privately bought sensors. The private sensors cluster where people can afford them, so lower-income areas get less coverage."
  - label: "The idea"
    text: "Utah already runs hundreds of public traffic cameras, and haze shows up in their pictures. Pair years of camera images with hourly PM2.5 readings and train a model to judge air quality from the picture alone."
  - label: "The result"
    text: "We collected over 218 million images from 1,395 cameras. In a first test on one camera, the model picked the right air-quality category 98.6% of the time."
---

## Coverage follows money

Air quality is usually measured in one of two ways: government monitoring stations (in Utah, the DAQ sampling stations) or privately owned, Wi-Fi-connected sensors such as PurpleAir. Both measure the air well in their immediate surroundings. Neither says much about the air a few neighborhoods away, so the resolution of an air-quality map is set by how many stations and sensors exist.

Private sensors add a second problem. People buy and host them, so their placement follows income. Lower-income areas end up with fewer sensors and less visibility into the air they breathe, a form of environmental discrimination built into the map itself.

<aside>On the poster's map of Utah, public traffic cameras outnumber PurpleAir sensors 1,395 to 778.</aside>

TCAM asks whether there is already a dense, evenly funded network of instruments pointed at the sky. There is: the Utah Department of Transportation (UDOT) publishes images from hundreds of traffic cameras along its roads. They were installed to watch traffic, but every frame also shows how far you can see.

## Cameras that are already there

Haze changes how far a camera can see. The poster's example pairs two frames from one Salt Lake camera taken in the same week, one on a good air-quality day and one on a bad one. The mountains behind the road are crisp in the first and washed out in the second, and the difference is obvious even at the cameras' low resolution.

TCAM is a modular application that correlates these images with particulate matter readings so that a model can estimate real-time air quality from a camera frame. It needs no new hardware, which fits the idea that runs through the rest of my work: get a new capability out of systems that are already deployed.

## Building the dataset

The system has two stages, data collection and data analysis, with a visualization layer on top.

For collection, a set of Python scripts scrapes each source on its own schedule. I collected over 218 million images from 1,395 traffic cameras across Utah between 2021 and 2025, more than 3 TB in all. Alongside them, the scripts gather the hourly PM2.5 values reported by DAQ stations, which become the training labels, plus auxiliary data such as weather and sun position. Some of these sources had existing APIs; for others I wrote new ones.

<dl class="results">
  <div><dt>traffic-camera images collected, 2021–2025</dt><dd>218M+</dd></div>
  <div><dt>public cameras, against 778 PurpleAir sensors</dt><dd>1,395</dd></div>
  <div><dt>size of the image dataset</dt><dd>3 TB+</dd></div>
</dl>

To make the data usable beyond this project, I built a web application with Flask and MongoDB that stores the collection and serves it through a Python API. Its interactive dashboard maps the traffic cameras, PurpleAir sensors, weather stations, and DAQ stations together, so a researcher can pull images and readings that line up in both time and place.

## Teaching a model to read haze

The labels come from the stations. A DAQ station reports PM2.5 once an hour, while a camera produces many frames in that hour. Each frame is paired with the reading for its hour, and that reading is converted into an Air Quality Index (AQI) category: good, moderate, unhealthy for sensitive groups, or unhealthy. The categories act as the classification thresholds.

{% include fig.html id="tcam-label" aspect="16/9" illustrative=true label="A synthetic traffic-camera scene grows hazier as PM2.5 rises through the day. Camera frames along a timeline take the AQI category of their hour's DAQ reading, and a model's predicted category is shown beside the image." caption="<strong>Labeling frames with the hour's reading.</strong> As the day plays, frames arrive several times an hour and each takes the AQI category of its hour's DAQ PM2.5 value. The classifier learns to predict that category from the image alone. Switch between a winter inversion day and a clean day. The scene, PM2.5 values, and model output are synthetic, and the category thresholds shown are the EPA's; the poster does not list its exact cutoffs." %}

Weather changes what a camera sees regardless of the air. To account for precipitation, we split the data into three season ranges: Spring–Summer, Summer–Fall, and Fall–Winter. For each, we trained a YOLO-cls image classifier to predict the AQI category of a frame.

## Results

In a preliminary test on a single camera, the model predicted the correct PM2.5 category **98.6%** of the time.

The confusion matrices on the poster show where it is strong and where it is not. For Spring–Summer, which contained only good and moderate hours, every good frame was classified correctly and 93% of moderate frames were, with the rest called good. Summer–Fall spanned all four categories:

<table>
  <thead><tr><th>predicted ↓ / actual →</th><th class="n">good</th><th class="n">moderate</th><th class="n">unhealthy</th><th class="n">sensitive groups</th></tr></thead>
  <tbody>
    <tr><th>good</th><td class="n"><b>0.99</b></td><td class="n">0.02</td><td class="n"></td><td class="n"></td></tr>
    <tr><th>moderate</th><td class="n">0.01</td><td class="n"><b>0.97</b></td><td class="n">0.06</td><td class="n"></td></tr>
    <tr><th>unhealthy</th><td class="n"></td><td class="n">0.01</td><td class="n"><b>0.81</b></td><td class="n"></td></tr>
    <tr><th>sensitive groups</th><td class="n"></td><td class="n">0.01</td><td class="n">0.12</td><td class="n"><b>1.00</b></td></tr>
  </tbody>
</table>

Each column is one true category and sums to about 1; "sensitive groups" is short for unhealthy for sensitive groups. The diagonal is strong. The weak spot is the unhealthy category: 81% of those frames were called unhealthy, and 12% were called unhealthy for sensitive groups, the neighboring category. Fall–Winter had only one category in its data, so it isn't shown.

These numbers come from one camera, so they show that a camera can learn its own view of the sky, not yet that a model transfers across cameras.

## What comes next

The result so far is a strong indication that traffic-camera images are a viable additional way to assess current air quality. The next step is to train across many cameras at once, toward regional and seasonal models that work on cameras the model hasn't seen. Alongside the classifier, I began integrating a pre-existing ResNet50 model that predicts PM2.5 as a number (a regression) rather than a category.

The other goal is to open the platform up: let scientists share their own data through the public dashboard, so that more labeled data is available to everyone working on the problem.
