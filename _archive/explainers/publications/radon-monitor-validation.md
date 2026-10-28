---
title:  "Long-Term Validation of a Consumer- vs. Industrial-Grade Indoor Radon and Air Quality Monitor at a School in Utah"
short_title: "Consumer radon monitor validation"
summary: "Consumer radon monitors cost a fraction of professional ones, but few have been tested outside a lab. Over about 29 weeks in six rooms of a Utah school, we compared a $249 consumer monitor with a calibrated industrial monitor side by side, for radon and five other air-quality measures."
authors: John D. Beard, Maren M. Ball, <b>Christopher Kitras</b>, Philip Lundrigan
venue: "Sensors, vol. 26, no. 16, article 5230, 2026"
venue_short: "Sensors 2026"
bib_venue: "Sensors"
venue_type: journal
year: 2026
area: airquality
doi: 10.3390/s26165230
figure: assets/luft_v_1028xp.png
link: assets/luft_v_1028xp.pdf
links:
  - text: "MDPI"
    url: https://www.mdpi.com/1424-8220/26/16/5230
    note: "Published version, open access"
fig_scripts: [radon-monitor-validation-average]
short:
  - label: "The problem"
    text: "Cheap home radon monitors that also report CO₂, humidity, and other measures are now common, but this one had only been tested in labs, for a few weeks, and only for radon."
  - label: "The idea"
    text: "Put a consumer monitor and a calibrated industrial monitor a few inches apart in six school rooms for about 29 weeks, then compare their readings hour by hour on equal terms."
  - label: "The result"
    text: "The consumer monitor's radon and air pressure readings matched the industrial monitor closely, and it flagged unsafe radon days well. Its CO₂, humidity, temperature, and VOC readings did not match, and it can't tell you radon during school hours alone."
---

## A cheaper monitor, an open question

Radon-222 comes from uranium decaying in soil, seeps into buildings through cracks and drains, and is the leading cause of lung cancer among non-smokers. The U.S. EPA recommends mitigation when a building's radon is at or above 4.0 picocuries per liter of air (pCi/L). Finding out whether a building crosses that line takes a monitor, and demand for them has grown along with a market of cheaper consumer models.

Many of those consumer monitors measure more than radon: carbon dioxide (CO<sub>2</sub>), volatile organic compounds (VOCs), barometric pressure, relative humidity, and temperature, each with its own health effects indoors. That raises a practical question for a school or a homeowner: **can a cheap consumer monitor stand in for a professional one, and for which of the things it measures?**

Earlier studies had tested this consumer monitor's radon readings only in laboratory chambers, for one to three weeks. No study had compared it with this industrial monitor, run it for longer than three weeks, run it in a real building, or checked its other five measurements at all.

## Two monitors, side by side

The consumer monitor is the SunRADON Lüft: $249 when we bought it, uncalibrated, and designed for easy setup with a phone app and cloud dashboard. The reference is the SunRADON Model 1028 XP, an industrial-grade monitor certified by U.S. and Canadian radon proficiency programs, calibrated for radon by the manufacturer every year, and used by building inspectors. Each cost $995, plus $199 for the environmental module that adds the other five measurements.

The study ran from 12 January to 6 June and from 20 September to 15 November 2024, in the same Utah school where we were [testing HVAC schedules for radon mitigation]({{ '/research/radon-hvac/' | relative_url }}). Earlier short-term charcoal tests had found five rooms at or above the EPA action level, so we monitored those five and one room below it: two classrooms, the custodian's office, the IT office, the library, and the music room. In each room, a Lüft and a 1028 XP sat within a few inches of each other, 0.76 to 1.37 m off the floor, both on wall power.

<aside>Placing the two monitors together controls by design for anything that differs between rooms, such as ventilation or floor drains.</aside>

## Comparing on equal terms

The two monitors don't report the same quantity. The 1028 XP logs the average of the last hour, every hour. The Lüft also logs every hour, but each value is the average of the last 24 hours, a moving average. To compare like with like, we averaged the 1028 XP's hourly values over the same sliding 24-hour window.

{% include fig.html id="radon-monitor-validation-average" aspect="16/9" illustrative=true label="Two weeks of hourly radon with daily dips during school hours and rises on weekends. A 24-hour window slides along and traces the smoother moving average the consumer monitor reports." caption="<strong>What a 24-hour moving average keeps.</strong> The thin line is hourly radon, the kind of record the 1028 XP keeps. The window slides along it and traces the 24-hour average, which is all the Lüft reports and what the 1028 XP data was converted to for the comparison. Hide the hourly line to see what is lost: the daily dips while the HVAC runs. The hourly series is synthetic; the weekday and weekend pattern follows the one the study observed." %}

That conversion has a cost the study could not avoid. A 24-hour average blends school hours with nights and weekends, and the hourly values can't be recovered from it. In this school, radon fell on weekdays while the HVAC exchanged indoor air for outdoor air, and rose over weekends when the system was off. A monitor that only reports 24-hour averages cannot say what staff breathed during school hours.

Each room produced between 4,845 and 4,847 paired measurements. Values were missing for about 13% of hours: the first 23 hours in each room, brief power outages, manual data downloads, a period when only four 1028 XPs were available, and interference in one room. Inverse probability weights corrected for the missing data, and linear mixed regression models accounted for repeated measurements within the same room. Agreement was summarized with the mean difference (Lüft minus 1028 XP) and the concordance correlation coefficient (CCC), which is 1 only when two instruments agree exactly, not merely move together.

## Radon agrees; most of the rest does not

<table>
  <thead><tr><th>Measure</th><th class="n">Mean difference</th><th class="n">95% CI</th><th class="n">CCC</th></tr></thead>
  <tbody>
    <tr><th>Radon, pCi/L</th><td class="n"><b>−0.05</b></td><td class="n">−0.24, 0.14</td><td class="n"><b>0.92</b></td></tr>
    <tr><th>Barometric pressure, inHg</th><td class="n">0.03</td><td class="n">0.01, 0.06</td><td class="n"><b>0.87</b></td></tr>
    <tr><th>Relative humidity, %</th><td class="n">−5.87</td><td class="n">−7.05, −4.69</td><td class="n">0.59</td></tr>
    <tr><th>Temperature, °C</th><td class="n">2.32</td><td class="n">1.77, 2.87</td><td class="n">0.48</td></tr>
    <tr><th>CO<sub>2</sub>, ppm</th><td class="n">−410.53</td><td class="n">−597.69, −223.37</td><td class="n">0.05</td></tr>
    <tr><th>VOC, ppb</th><td class="n">−194.74</td><td class="n">−308.82, −80.66</td><td class="n">0.03</td></tr>
  </tbody>
</table>

For radon, the Lüft read on average 0.05 pCi/L below the 1028 XP, a difference indistinguishable from zero (p = 0.50), and the two agreed closely (CCC 0.92) across a range of 0.44 to 22.49 pCi/L. Barometric pressure also agreed closely. The Lüft read lower than the 1028 XP for CO<sub>2</sub>, relative humidity, and VOCs, and higher for temperature, with agreement too weak to trust.

The practical question is often simpler: is this room at or above the EPA action level? Taking the 1028 XP as truth, the Lüft flagged 81% of the 24-hour averages that were at or above 4.0 pCi/L and correctly cleared 96% of those below it.

<dl class="results">
  <div><dt>mean radon difference, Lüft minus 1028 XP (p = 0.50)</dt><dd>−0.05 pCi/L</dd></div>
  <div><dt>radon agreement (concordance correlation)</dt><dd>0.92</dd></div>
  <div><dt>sensitivity / specificity at the 4.0 pCi/L action level</dt><dd>0.81 / 0.96</dd></div>
  <div><dt>Lüft price vs. 1028 XP with module</dt><dd>$249 vs. $1,194</dd></div>
</dl>

The paper can't say for certain why the other measures disagree. Both monitors measure CO<sub>2</sub> and VOCs with the same hardware and a self-baselining method that resets at varying times, so baselines drifting apart could explain part of the gap. Humidity and temperature use different hardware in the two monitors, and since indoor humidity and temperature usually move in opposite directions, one reading high and the other low is not surprising.

## What it means for schools

The Lüft is a valid, much cheaper option for long-term radon monitoring and for flagging rooms above the action level, and it needs no annual factory calibration. It is not a substitute for the industrial monitor when you need radon over periods shorter than a day, such as school hours, or when CO<sub>2</sub>, humidity, temperature, or VOCs are the point.

The study also recorded the school's own air. The median 24-hour radon was 1.98 pCi/L, yet 15% of 24-hour averages were at or above the action level. Over a quarter of 24-hour CO<sub>2</sub> averages reached 1,000 ppm, and more than half of humidity readings fell below the EPA's recommended 30% to 60%. The study covers one school, and the authors call for repeating it in other schools and in homes.
