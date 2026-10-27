---
title:  "Utilizing Low-Cost Sensors to Monitor Indoor Air Quality in Mongolian Gers"
short_title: "Air quality in Mongolian gers"
summary: "Most households in Ulaanbaatar's ger districts heat and cook with coal through one of the coldest winters of any capital city. A network of low-cost cellular sensors measured indoor PM2.5 through a winter to test whether insulating gers, and switching them to electric heat, cleans the air inside."
authors: Callum E. Flowerday, Philip Lundrigan, <b>Christopher Kitras</b>, Tu Nguyen, Jaron C. Hansen
venue: "Sensors, vol. 23, no. 18, article 7721, 2023"
venue_short: "Sensors 2023"
bib_venue: "Sensors"
venue_type: journal
year: 2023
area: airquality
doi: 10.3390/s23187721
figure: assets/mongolia.jpg
link: assets/utilizing-aq.pdf
links:
  - text: "MDPI"
    url: https://www.mdpi.com/1424-8220/23/18/7721
    note: "Published version, open access"
  - text: "Code"
    url: https://github.com/NET-BYU/air_quality_firmware
    note: "Sensor firmware for the Particle platform"
fig_scripts: [mongolian-gers-uplink, mongolian-gers-pm]
short:
  - label: "The problem"
    text: "In Ulaanbaatar, most families in the ger districts burn coal for heat and cooking, and the smoke fills their homes. A charity insulated some gers, hoping they would need less coal, and needed to know whether the air inside actually got cleaner."
  - label: "The idea"
    text: "Build a roughly $200 sensor that uploads over the cell network, calibrate it against coal smoke in the lab, and place one in each of dozens of gers for a whole winter."
  - label: "The result"
    text: "Insulated gers had 17.5% less fine particulate pollution, and insulated gers heated by electricity had 48.9% less. Even those still had about six times the WHO guideline."
---

## Air inside a ger

A ger, or yurt, is the round, portable felt home of Mongolia's nomadic tradition. As of 2020, about 60% of Ulaanbaatar's residents lived in "ger areas," where 95% of households heat and cook with coal and wood, each burning about 5 tons of coal a year. January lows average −22 °C, so the stoves run hard all winter, and the smoke stays close to the homes that make it. Fine particulate matter (PM2.5, particles 2.5 µm across or smaller) is linked to asthma, heart disease, cancer, and other conditions, and in Ulaanbaatar alone it has been blamed for 1,400 deaths a year.

Deseret International Charities sponsored a program to insulate gers by wrapping the walls and roof in a radiant barrier with an air gap between the existing felt layers. The hope was that a warmer ger burns less coal and so has cleaner air. Testing that means measuring the air inside many homes for a whole winter, and indoor monitoring at that scale is expensive with conventional instruments. **Can low-cost sensors, carefully calibrated, show whether insulation and electric heating improve the air inside gers?**

## A sensor built for the job

No commercial low-cost sensor fit. None offered cellular connectivity, which the gers needed, and the team wanted access to the raw particle data. So the deployment used a custom monitor, which I developed around the Particle platform: a Sensirion SPS30 particle sensor, a Sensirion SCD30 for CO<sub>2</sub>, temperature, and humidity, a real-time clock, an SD card, and a Particle Boron cellular microcontroller, on a printed circuit board in a 3D-printed case, for about $200 per unit.

Each monitor took a reading every minute and uploaded over the cellular network every five minutes to an InfluxDB database at BYU, with Grafana dashboards on top. Along with the readings it reported metadata: cell signal strength, firmware version, and uptime. A cellular link in a city winter drops out, so the firmware assumes it will: every reading is also written to the SD card, and when the network is down, readings wait on the device and are sent as a batch when the connection returns.

{% include fig.html id="mongolian-gers-uplink" aspect="16/9" illustrative=true label="A sensor sends batches of readings to a database through a cell tower every five minutes. When the cellular link drops, readings queue on the device and are sent together when it returns, filling the gap in the database." caption="<strong>Riding out an outage.</strong> Readings are taken every minute and sent in batches every five. When the link drops, they wait on the device, with a copy on the SD card, and the backlog is sent the moment the network returns, so the gap in the database fills in late rather than staying empty. Drag the slider to lengthen the outage. Minute-by-minute timing and travel time are exaggerated." %}

Running fifty of these from the other side of the world was a fleet problem as much as a hardware one. I managed the fleet with cloud tools, including over-the-air firmware updates, structured the firmware into modules so that new peripherals could be added without a redesign, and made cloud data transfer more efficient by adding buffering through Google Pub/Sub. Maintenance worked on two levels. The Particle cloud console showed which devices were online and uploading, and the firmware reported when an SD card was unplugged or not logging. When a sensor went silent for too long, a partner in Ulaanbaatar visited the ger to repair or replace it.

## Calibrating against coal smoke

Most low-cost particle sensors count particles by the light they scatter. At high concentrations one particle can shadow another, which then scatters no light and goes uncounted. This *coincidence* makes cheap sensors read low exactly where the gers are worst.

To correct for it, the team calibrated the sensors against a TSI Model 3300 optical particle sizer fitted with a 10:1 diluter, which keeps the reference instrument out of its own coincidence range. A sensor was mounted inside a test chamber made from a 55-gallon drum, cleaned beforehand with UV lights and zero air. Smoke came from anthracite coal burned in a cast-iron stove similar to those used in gers, pulled into the chamber by fans that kept it mixed. Plotting the sensor's readings against the reference gave a second-order polynomial correction, which changes high readings more than low ones, as coincidence predicts. Because the sensors age, they were calibrated again after six months in use.

## Fifty gers through a winter

Fifty sensors went into gers in Ulaanbaatar in September 2019 and ran until the end of April 2020, each mounted on one of the ger's central support beams. Hardware failures, households that stopped participating, and trouble retrieving data meant that data came back from 28 of them. The gers fell into four groups: unmodified gers heated with coal, which served as the control, and insulated gers heated with coal, with coal and electricity, or with electricity alone. For comparison, outdoor PM2.5 came from the monitor at the U.S. Embassy.

The analysis split each day in two. From 5 am to 8 pm, PM2.5 rose in three peaks for breakfast, lunch, and dinner, so daytime data mostly reflects cooking. From 8 pm to 5 am it mostly reflects heating.

## What the sensors showed

{% include fig.html id="mongolian-gers-pm" aspect="16/9" label="Average indoor PM2.5 in four kinds of ger, compared with outdoor PM2.5 at the U.S. Embassy, for the whole day, daytime, and nighttime." caption="<strong>Indoor PM2.5 by ger type.</strong> Bars are the average indoor PM2.5 for each kind of ger; the dashed line is the outdoor average over the same period. In the daytime most gers are dirtier than the air outside. At night the outdoor air is worse than every group, so each opening of the door lets smoke in. Values are from the paper; choose a view or let it cycle." %}

PM2.5 fell as coal use fell. Unmodified gers averaged 187.0 µg/m³. Insulation alone cut that by 17.5%, adding electric heat by 19.1%, and going fully electric by 48.9%. Insulation works against itself a little: a tighter ger burns less coal but also vents its smoke more slowly. On balance it still helped.

<dl class="results">
  <div><dt>less PM2.5 in insulated, coal-heated gers</dt><dd>17.5%</dd></div>
  <div><dt>less PM2.5 in insulated, all-electric gers</dt><dd>48.9%</dd></div>
  <div><dt>all-electric gers vs. the WHO guideline of 15 µg/m³</dt><dd>6.4×</dd></div>
  <div><dt>outdoor PM2.5 at night, U.S. Embassy</dt><dd>229 µg/m³</dd></div>
</dl>

<table>
  <thead><tr><th>PM2.5, µg/m³</th><th class="n">Whole day</th><th class="n">Daytime</th><th class="n">Nighttime</th></tr></thead>
  <tbody>
    <tr><th>Unmodified, coal</th><td class="n">187.0</td><td class="n">180.3</td><td class="n">198.3</td></tr>
    <tr><th>Insulated, coal</th><td class="n">154.3</td><td class="n">126.2</td><td class="n">200.5</td></tr>
    <tr><th>Insulated, coal + electric</th><td class="n">151.4</td><td class="n">142.0</td><td class="n">167.5</td></tr>
    <tr><th>Insulated, electric only</th><td class="n">95.5</td><td class="n">84.4</td><td class="n">113.4</td></tr>
    <tr><th>Outdoors (U.S. Embassy)</th><td class="n">153.5</td><td class="n">108.4</td><td class="n">229.0</td></tr>
  </tbody>
</table>

The day and night split explains why even all-electric gers stayed far above the WHO guideline. At night, the outdoor air, at 229.0 µg/m³, was dirtier than every group of gers. Each time a door opened, smoke from the neighbors' stoves rushed in, and insulation then held it inside. An electric ger in a neighborhood that still burns coal can only be as clean as the air around it.

## What I'd take from it

Insulation helps, and electricity helps much more, but one household can't fully escape its neighborhood's smoke. The study's recommendation is to insulate gers and to switch them to electric heat and cooking wherever electricity is available. It also suggests insulating neighboring gers together, which could lower outdoor PM2.5 as well.

For me, the lesson was in the sensors. A $200 sensor becomes a scientific instrument only with work: calibration against the right smoke, firmware that survives a weak cellular network, and enough remote management that fifty devices on another continent keep reporting through a winter.
