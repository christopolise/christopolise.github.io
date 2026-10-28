---
title: Interactive Underwater Acoustic Simulator with Ray Tracing
authors: <b>Christopher Kitras</b>, Ashton Palacios
venue: 'ECEN 528: High Performance Parallel Computing, Brigham Young University'
year: 2023
figure: assets/bellhop2.png
link: assets/opengl_bellhop.pdf
links:
- text: Presentation
  url: assets/opengl_bellhop_presentation.pdf
  note: Class presentation slides
- text: Code
  url: https://github.com/christopolise/bellhop-opengl
  note: The OpenGL frontend on GitHub
- text: Demo
  url: https://www.youtube.com/watch?v=2t0jKzGrOC4
  note: Video of the simulator running
link_label: Report
fig: bellhop-rays
fig_aspect: 16/9
fig_label: A fan of acoustic rays leaves a source at 1 km depth. Beside it, a sound-speed profile. Rays bend toward the slowest water; in a deep sound channel, shallow-angle rays stay trapped while steeper rays reflect off the surface and floor.
fig_caption: <strong>Rays bending through a sound-speed profile.</strong> Each ray is marched in small steps and turned at each one by the local sound-speed gradient (Snell's law), the same idea BELLHOP's ray mode uses. The left panel is the profile, as in our simulator's second viewport. Switch profiles to see trapped rays in a deep sound channel, straight rays in uniform water, and rays curving upward when speed rises with depth. The profiles, depths, and ray count are textbook examples, not the environment from the report.
fig_illustrative: true
about: BELLHOP is a standard model of how sound bends underwater as temperature and salinity change with depth, but using it meant editing configuration files and rerunning it for every change. We built an OpenGL program that runs the model inside the render loop and draws its rays live, with on-screen controls for the sound-speed profile. It draws hundreds to thousands of rays in real time, and on a GPU a full frame took about 5 ms instead of 17.
---
