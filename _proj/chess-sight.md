---
title: 'Chess Sight: A Computer Vision System for Stockfish'
authors: Bryson Schiel, <b>Christopher Kitras</b>, Matthew McKinney
venue: 'ECEN 631: Robotic Vision, Brigham Young University'
year: 2024
figure: assets/chess_sight.png
links:
- text: Code
  url: https://github.com/schielb/Chess_Sight
  note: Python source, piece datasets, and training runs on GitHub
- text: Demo
  url: https://www.youtube.com/watch?v=CekWy9jhOeQ
  note: Video of the system on YouTube
fig: chess-sight-warp
fig_aspect: 16/9
fig_label: A tilted camera view of a chessboard is matched to a reference photo with feature lines, warped into a top-down view, reduced to blue and red blobs, and scanned square by square to count occupied squares for each color.
fig_caption: <strong>From camera frame to occupied squares.</strong> Feature matches tie the camera frame to the reference photo, RANSAC throws out the bad pairs, and the fitted homography warps the frame so the 64 squares line up. Only blue and red pixels survive the color masks, and each square is summed and thresholded, so the two small specks don't count as pieces. Move the camera to see the same steps from another angle. The camera poses, feature points, and specks are made up; the order of the steps follows the code.
fig_illustrative: true
about: A webcam watches a real chessboard and lets you play the Stockfish engine on it. The app lines its view up with a reference photo of the board, finds the blue and red pieces by color, and works out each move from which squares emptied and filled. Stockfish checks the move and answers, and its replies are drawn as arrows on the live video.
---
