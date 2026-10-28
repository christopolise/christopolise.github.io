---
title:  "Chess Sight: A Computer Vision System for Stockfish"
short_title: "Chess Sight"
summary: "A webcam watches a real chessboard, reads each move from where the colored pieces sit, and plays you through the Stockfish engine, drawing its replies and suggestions as arrows on the live video."
authors: Bryson Schiel, <b>Christopher Kitras</b>, Matthew McKinney
venue: "ECEN 631: Robotic Vision, Brigham Young University"
venue_short: "ECEN 631, BYU"
year: 2024
figure: assets/chess_sight.png
link: https://www.youtube.com/watch?v=CekWy9jhOeQ
link_label: "Watch the demo"
links:
  - text: "Code"
    url: https://github.com/schielb/Chess_Sight
    note: "Python source, piece datasets, and training runs on GitHub"
  - text: "Demo"
    url: https://www.youtube.com/watch?v=CekWy9jhOeQ
    note: "Video of the system on YouTube"
fig_scripts: [chess-sight-warp, chess-sight-move]
short:
  - label: "The goal"
    text: "Play a chess engine on a real board, with a camera instead of a keyboard, so the computer sees your moves and shows you its own."
  - label: "What we built"
    text: "A webcam app that lines its view up with a reference photo of the board, finds the blue and red pieces by color, and works out each move from which squares emptied and filled. Stockfish checks the move and answers."
  - label: "How it went"
    text: "The full loop runs as a browser app on a live camera feed, and a demo video accompanies the code. We also trained a piece detector that scored 0.995 mAP@50 on its validation images and drew its boxes as an optional overlay."
---

## The goal

Playing a chess engine usually means typing moves or clicking on a screen. We wanted to play Stockfish, the open-source engine, on a physical board. A webcam above the table watches the game. When you move, the system works out which move you made, asks Stockfish whether it is legal, and gets the engine's reply. The computer has no arm, so it shows its move as an arrow drawn over the live video, and you move its piece for it.

The set we used has blue and red pieces instead of white and black. That choice shapes the whole design. A strongly colored piece stands out from the board's squares, so the system can read the game without ever recognizing what kind of piece it is looking at.

## Finding the board in any frame

The camera is not directly overhead, so the board appears as a tilted, foreshortened shape, and it need not sit in the same place in every frame. Before the system can say anything about square e4, it has to know where e4 is in this particular frame.

It solves that once, against a **reference photo** of the board. OpenCV's chessboard-corner finder locates the 7 × 7 grid of inner corners in the reference, and the code extends that grid by one square on every side to get all 81 corners and the centers of all 64 squares. Those locations are fixed in the reference image from then on.

Each time a move needs reading, the new camera frame is matched against the reference:

1. **Features.** SIFT finds distinctive points in both images, and a FLANN matcher pairs them up. A pair is kept only if its best match is clearly better than its second best (Lowe's ratio test at 0.7).
2. **Homography.** A homography is the 3 × 3 projective transform that maps one view of a flat surface onto another. RANSAC fits it from the matched points while ignoring pairs that disagree, with a 5-pixel tolerance. If fewer than five good matches survive, the frame is rejected.
3. **Warp.** The frame is warped into the reference view. Now every square sits exactly where it sat in the reference photo.
4. **Color masks.** In HSV color space, two thresholds keep only blue pixels (hue 100 to 130 on OpenCV's scale) and only red pixels (hue 0 to 10, with saturation and brightness of at least 50). Each mask is blurred with a 21 × 21 Gaussian and thresholded again, which fills in pieces and erases isolated pixels.
5. **Occupancy.** For each square, the mask values inside it are summed. A square counts as holding a blue (or red) piece when its sum passes 100,000, roughly 390 fully lit mask pixels. Smaller patches of color, like a reflection, stay below that line.

{% include fig.html id="chess-sight-warp" aspect="16/9" illustrative=true label="A tilted camera view of a chessboard is matched to a reference photo with feature lines, warped into a top-down view, reduced to blue and red blobs, and scanned square by square to count occupied squares for each color." caption="<strong>From camera frame to occupied squares.</strong> Feature matches tie the camera frame to the reference photo, RANSAC throws out the bad pairs, and the fitted homography warps the frame so the 64 squares line up. Only blue and red pixels survive the color masks, and each square is summed and thresholded, so the two small specks don't count as pieces. Move the camera to see the same steps from another angle. The camera poses, feature points, and specks are made up; the order of the steps follows the code." %}

The output is two lists, the squares holding blue pieces and the squares holding red ones. That is all the system knows about the position, and it turns out to be enough.

## From two snapshots to a move

The program keeps the occupied squares from after the last accepted move. When a new frame is read, it compares the mover's color only:

- The square that the mover occupied before but not now is where the piece **started**.
- The square the mover occupies now but did not before is where it **ended**.

Joined, they make a move in the notation Stockfish expects, such as `e2e4`. Captures need no special case. The captured piece belongs to the other color, so it doesn't appear in the mover's comparison; the capturing piece simply ends on a square it didn't hold before. Castling is the one move where two of the mover's pieces change squares at once. When the comparison finds two emptied and two filled squares, the code looks the pattern up in a small table (for example, e1 and h1 emptied, f1 and g1 filled) and reports the king's move, `e1g1`.

{% include fig.html id="chess-sight-move" aspect="16/9" illustrative=true label="A chessboard with blue and orange pieces. A blue piece moves, the emptied square is outlined, the newly filled square is shaded, and the move string appears with Stockfish's verdict." caption="<strong>Reading a move without knowing the pieces.</strong> The system compares only the mover's occupied squares before and after. The square that emptied is the start and the square that filled is the end. Try a capture, where the captured piece's color is simply left out of the comparison, and castling, where two emptied and two filled squares are looked up in a table. The positions are made up; the rule is the one in the code." %}

Because the system reads squares rather than pieces, it can't tell which piece a pawn promotes to: the move string has no room for it. It also assumes the board is otherwise left alone between frames.

## Playing against Stockfish

A small state machine runs the game: waiting to start, player's turn, computer's turn. Stockfish is driven through its Python wrapper, and it does three jobs.

- **Referee.** Every move read from the camera goes to Stockfish's legality check. An illegal or unreadable move leaves the game on the player's turn, and the app reports it.
- **Opponent.** After a legal player move, Stockfish chooses its reply. The app draws it as an arrow over the live video. When the player has moved the engine's piece, the next frame is read, and the game continues only if the observed move matches the engine's move exactly. Otherwise it waits for the board to be fixed.
- **Coach.** On the player's turn, the app draws Stockfish's top three candidate moves as arrows of decreasing thickness, mapped onto the video through the same homography.

The engine's skill level is set from the menu: easy, medium, and hard map to Stockfish skill levels 5, 10, and 15. An evaluation bar shows who is ahead by squashing Stockfish's score (in centipawns, hundredths of a pawn) into a percentage:

<div class="eq">bar = 100 / (1 + e<sup>−score / 50</sup>)</div>

The interface is a Flask web app that streams the camera as video, with the move history, the settings, and a choice of four views: **Aided** (the arrows), **Masked** (the blue and red masks the move reader sees), **Bounded** (boxes from a neural piece detector), and **None**.

## A neural piece detector

The Bounded view comes from a separate model. We fine-tuned YOLOv8x, a large object detector, to find and classify all twelve kinds of piece (six types in each color). The final dataset export has 332 images at 640 × 640 pixels, labeled with all twelve classes and expanded by augmentation (three versions of each source image, with random flips, quarter turns, small rotations and shears, and exposure changes). Training ran for 100 epochs.

<dl class="results">
  <div><dt>validation mAP@50 after 100 epochs</dt><dd>0.995</dd></div>
  <div><dt>validation mAP@50–95</dt><dd>0.893</dd></div>
  <div><dt>images in the final labeled dataset</dt><dd>332</dd></div>
</dl>

The validation images come from the same dataset as the training images, so the scores show how well the detector learned that data, not how it would do with a different set or board. Move reading never depends on it: the game logic uses the color masks, and the detector only draws boxes for the overlay.

## What we'd take from it

The core decision was to avoid recognizing pieces at all. A rules engine already knows what every piece is, so the camera only has to say which squares changed. Reading occupancy by color, through a homography to a fixed reference, is simple to debug: each step produces an image you can look at, which is exactly what the Masked view shows. The cost is that the system depends on a colored set and on fixed color thresholds tuned to it. The neural detector shows the other route and why it is harder to trust: it needs labeled data for the exact set it will see, and its validation score can't say how it would do on a set it hasn't seen.
