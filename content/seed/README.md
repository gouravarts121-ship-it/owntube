# Seed media

These clips are intentionally small public samples used to exercise the pipeline:

| File | Source | License |
| --- | --- | --- |
| `bbb-720.mp4` | Big Buck Bunny (Blender Foundation), via test-videos.co.uk | CC BY 3.0 |
| `jellyfish-720.mp4` | Jellyfish sample, via test-videos.co.uk | sample footage |
| `termux-demo.mp4` | Generated locally (`ffmpeg` testsrc2 + sine) | public domain |
| `vertical-clip.mp4` | Generated locally, 720x1280 (Shorts policy fixture) | public domain |

Videos are not committed (see `.gitignore`). Regenerate or fetch them with:

```bash
mkdir -p content/seed
curl -L -o content/seed/bbb-720.mp4 https://test-videos.co.uk/vids/bigbuckbunny/mp4/h264/720/Big_Buck_Bunny_720_10s_1MB.mp4
curl -L -o content/seed/jellyfish-720.mp4 https://test-videos.co.uk/vids/jellyfish/mp4/h264/720/Jellyfish_720_10s_1MB.mp4
ffmpeg -f lavfi -i testsrc2=size=1280x720:rate=30 -f lavfi -i sine=frequency=440 \
  -t 18 -c:v libx264 -preset veryfast -pix_fmt yuv420p -c:a aac content/seed/termux-demo.mp4
ffmpeg -f lavfi -i testsrc2=size=720x1280:rate=30 -t 12 \
  -c:v libx264 -preset veryfast -pix_fmt yuv420p content/seed/vertical-clip.mp4
node server/scripts/seed.mjs
```

`seed.json` carries titles, descriptions, tags and license notes; `vertical-clip.mp4`
is tagged `shorts` so it is stored but excluded from feed, search and downloads.
