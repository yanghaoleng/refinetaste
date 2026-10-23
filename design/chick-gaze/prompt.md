# 左下 / 右下视线表情

使用内置 image_gen，根据现有 chick-cool-expressions.webp 延展。原始生成文件保存为 source.png；scripts/build-gaze-expressions.py 将四帧缩至每格 96 × 96，合成 192 × 192 WebP。

## 生成提示词

Create an animation sprite sheet matching the exact yellow cartoon chick face identity and finish of the reference, huge circular yellow face filling each square tile, glossy expressive eyes, orange small beak, red rounded neckerchief knot partially visible bottom, no body, no face outline. 2 columns x 2 rows, exactly four equal square tiles, aligned face/eyes/bow placement, warm yellow background no margins or gutters. LEFT COLUMN: chick looking diagonally toward viewer's lower LEFT, both pupils clearly directed lower left, curious friendly expression. RIGHT COLUMN: same chick looking diagonally toward viewer's lower RIGHT, both pupils clearly directed lower right. TOP ROW animation frame 1 with eyes open. BOTTOM ROW animation frame 2 same gaze direction and composition, a subtle lower eyelid squint and slight eyebrow change, eyes still visibly looking diagonally down, no closed eyes, avoid looking straight ahead. Identical camera and facial proportions across all 4 tiles, clear directional pupils readable at 64px. No sunglasses, no text, no extra symbols. This is a precise-object-edit expression expansion. Output square sheet at high quality.
