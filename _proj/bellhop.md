---
title:  "OpenGL Frontend for BELLHOP, a Real-Time Simulation Tool"
short_title: "BELLHOP in OpenGL"
summary: "BELLHOP is a standard model of how sound travels underwater, but changing its inputs means editing files by hand and rerunning it. We built an interactive OpenGL frontend that runs the model inside the render loop, so the rays redraw as you change the water."
authors: <b>Christopher Kitras</b>, Ashton Palacios
venue: "ECEN 528: High Performance Parallel Computing, Brigham Young University"
venue_short: "ECEN 528, BYU"
year: 2023
figure: assets/bellhop2.png
link: assets/opengl_bellhop.pdf
link_label: "Read the report"
links:
  - text: "Presentation"
    url: assets/opengl_bellhop_presentation.pdf
    note: "Class presentation slides"
  - text: "Code"
    url: https://github.com/christopolise/bellhop-opengl
    note: "The OpenGL frontend on GitHub"
  - text: "Demo"
    url: https://www.youtube.com/watch?v=2t0jKzGrOC4
    note: "Video of the simulator running"
fig_scripts: [bellhop-rays, bellhop-frame]
short:
  - label: "The goal"
    text: "Sound underwater bends as the water's temperature and saltiness change with depth, and a model called BELLHOP predicts those paths. Using it meant editing configuration files and rerunning a program for every change."
  - label: "What we built"
    text: "An OpenGL program that runs the BELLHOP model every frame and draws its sound rays live, with on-screen controls that change the speed of sound at each depth."
  - label: "How it went"
    text: "It draws hundreds to thousands of rays in real time. On a GPU, drawing ran up to about 8 times faster than on the CPU, and a full frame took about 5 ms instead of 17."
---

## Why simulate sound underwater

Underwater, the medium forces communication onto sound, at carrier frequencies from kilohertz to hundreds of kilohertz, so data rates are far lower than on land. The water makes it harder still. Temperature, salinity, and suspended particles vary with depth, and each changes the speed of sound. Where the speed changes, sound waves bend, and paths that bend differently can arrive out of step and interfere.

Engineers who design underwater modems and protocols therefore lean on propagation models. BELLHOP is a widely used one: a beam-tracing model that predicts the pressure field a sound source creates, given the sea surface (altimetry), the seafloor (bathymetry), the sound-speed profile, and the positions of transmitter and receiver.

The friction is in how it is used. Those parameters live in configuration files that the program reads at startup. To try a different sound-speed profile you edit a file by hand, rerun the model, and then hand its output to a separate Python script to plot. Our lab was starting a project on peer-to-peer networks of underwater robots and needed a simulator where parameters could change quickly. This course project was the start of that tool.

<aside>BELLHOP was written in FORTRAN and later given Python bindings. A newer C++ and CUDA port, bellhopcxx / bellhopcuda, is the one we built on.</aside>

## What the model computes

BELLHOP traces rays. A source sends out a fan of rays at different launch angles, and each is followed step by step through the water. At every step the ray turns toward slower water by an amount set by Snell's law. When it reaches the surface or the seafloor, it reflects.

The sound-speed profile, the speed of sound at each depth, is what shapes the result. If the water is slowest at some middle depth, as in the first profile below, rays launched near that depth keep bending back toward it and can travel a long way without touching the surface or the floor. That is the effect our frontend lets you change live: edit the profile and watch the rays rearrange.

{% include fig.html id="bellhop-rays" aspect="16/9" illustrative=true label="A fan of acoustic rays leaves a source at 1 km depth. Beside it, a sound-speed profile. Rays bend toward the slowest water; in a deep sound channel, shallow-angle rays stay trapped while steeper rays reflect off the surface and floor." caption="<strong>Rays bending through a sound-speed profile.</strong> Each ray is marched in small steps and turned at each one by the local sound-speed gradient (Snell's law), the same idea BELLHOP's ray mode uses. The left panel is the profile, as in our simulator's second viewport. Switch profiles to see trapped rays in a deep sound channel, straight rays in uniform water, and rays curving upward when speed rises with depth. The profiles, depths, and ray count are textbook examples, not the environment from the report." %}

We scoped the semester to two of BELLHOP's features: ray and eigenray runs, and live edits to the sound-speed profile. Seeing the rays shows how sound will spread through an environment, which is what you need to decide where to place robots for the best signal.

## Putting the model inside the renderer

Existing tools run a precompiled BELLHOP binary and then plot its output files. We compiled our code into the C++/CUDA implementation instead. The model exposes an input-parameter struct and an output struct, and through a good deal of trial and error we learned to switch the run mode between normal rays and eigenrays and to replace the sound-speed profile on the fly. Skipping file I/O lets the model run once per frame. The hardest part of the integration was not the physics but the build: the project's CMake is extensive, and getting it to compile and link the OpenGL libraries took real work.

The frontend uses raw OpenGL rather than a framework such as SFML or SDL. GLFW handles windows and input, GLAD loads OpenGL, and ImGui supplies the sliders, buttons, and input fields. Working this close to OpenGL keeps rendering overhead low, at the cost of bookkeeping: for every kind of object we write and compile a shader, fill a vertex array and vertex buffer, choose how the vertices connect, and free it all afterward. Text has no native support in OpenGL, so the axis labels use a renderer from the Learn OpenGL tutorials, and the sound-speed curve in the second viewport is drawn with an existing spline library.

Each frame clears the previous drawing, runs BELLHOP with the current parameters, and draws the new rays and profile. That loop is what makes the model feel instantaneous.

The C++/CUDA project can be built for the CPU or the GPU by flipping one CMake option. We kept that ability so we could benchmark both, which meant copying ray data back to the host for drawing. A GPU-only design would leave the rays in GPU memory for OpenGL to read directly; the copy costs some speed, and we accepted it to finish within the semester.

## CPU versus GPU

We built one binary that runs both the model and the graphics on the CPU (with the C++ model) and one that uses the GPU (with the CUDA model), then ran two tests with normal rays so we controlled exactly how many were computed and drawn.

The first test swept from 100 to 1,000 rays. The GPU sped up the graphics at every size, by 2.7 to 8.2 times. The model itself gained less, and for some runs of 400 rays or fewer it was slower on the GPU, which we attribute to the cost of moving memory between host and GPU. The C++/CUDA project's own documentation says large speedups appear only at tens of thousands of rays, more than our renderer could draw coherently.

<table>
  <thead><tr><th class="n">Rays</th><th class="n">BELLHOP speedup</th><th class="n">Graphics speedup</th></tr></thead>
  <tbody>
    <tr><td class="n">100</td><td class="n">0.80</td><td class="n">3.17</td></tr>
    <tr><td class="n">200</td><td class="n">0.63</td><td class="n">2.69</td></tr>
    <tr><td class="n">300</td><td class="n">1.01</td><td class="n">4.70</td></tr>
    <tr><td class="n">400</td><td class="n">0.84</td><td class="n">3.23</td></tr>
    <tr><td class="n">500</td><td class="n">1.33</td><td class="n">6.70</td></tr>
    <tr><td class="n">600</td><td class="n">1.27</td><td class="n">4.58</td></tr>
    <tr><td class="n">700</td><td class="n">2.32</td><td class="n">8.17</td></tr>
    <tr><td class="n">800</td><td class="n">1.55</td><td class="n">5.79</td></tr>
    <tr><td class="n">900</td><td class="n">1.55</td><td class="n">5.47</td></tr>
    <tr><td class="n">1000</td><td class="n">1.63</td><td class="n">5.16</td></tr>
  </tbody>
</table>

The second test rendered 1,000 rays in the same starting environment and timed each part of a frame: preprocessing, the BELLHOP run, post-processing, vertex population, drawing (which also includes printing values to the console), and swapping buffers. We checked with `nvidia-smi` that the GPU build really used the GPU for both the model and the rendering.

{% include fig.html id="bellhop-frame" aspect="16/9" label="Two timelines of rendered frames. The CPU build spends about 16.8 ms per frame, mostly drawing; the GPU build spends about 4.9 ms, split more evenly between preprocessing, the BELLHOP run, and drawing." caption="<strong>Where a frame's time goes.</strong> Frames from each build play back to back on a shared time axis, slowed about 200 times, so the GPU build fits more of them into the same 40 ms. Switch to the share view to compare one frame from each as percentages. Phase times are the report's measurements for 1,000 rays; post-processing and vertex population took under 0.002 ms and are too small to draw." %}

<dl class="results">
  <div><dt>frame time on the CPU, 1,000 rays</dt><dd>16.8 ms</dd></div>
  <div><dt>frame time on the GPU, 1,000 rays</dt><dd>4.9 ms</dd></div>
  <div><dt>best graphics speedup on the GPU (700 rays)</dt><dd>8.17×</dd></div>
</dl>

On the CPU, drawing took 10.17 ms, over 60% of the frame. On the GPU it fell to 1.81 ms, and the time spread more evenly: preprocessing became the largest share at about 40%, with the model run and drawing close behind. The full frame went from about 16.8 ms to about 4.9 ms.

## Where it was headed

The project is a first step toward a real-time underwater acoustic simulator for the lab, and it changed how BELLHOP can be used: parameters adjust while the model runs, instead of between runs. The next steps we identified were keeping ray data in GPU memory so OpenGL can draw it without a round trip to the host, supporting more of BELLHOP's features including its 3D model, and contributing the work back to the BELLHOP acoustic toolbox.

We set out originally to run BELLHOP's beam tracing on an NVIDIA card's RTX ray-tracing cores through the OptiX API. A closer look showed that would take deep knowledge of both OptiX and the underwater acoustics inside the model, more than a semester allowed, so we narrowed the scope to the interactive frontend.
