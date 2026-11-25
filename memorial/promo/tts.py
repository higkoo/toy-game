import asyncio, os, subprocess, json
import edge_tts

OUT = "/tmp/memorial-video/audio"
os.makedirs(OUT, exist_ok=True)
VOICE = "zh-CN-YunjianNeural"  # 男声，小说叙事，有力量
RATE = "-4%"

# 9 段旁白，对应 9 个镜头。短句、口语、带冷幽默。
LINES = [
    ("01_intro", "如果有一天，AI 把所有数学难题都解完了，人类还剩下什么？"),
    ("02_world", "2026 年，AI 证明了黎曼猜想。此后，证明、作图、修图、计算，一样一样被接管。我们建了这座展厅，把那些曾经需要人亲手完成的手艺，送进来。"),
    ("03_gallery", "六件旧物，六块墓碑。请慢慢走，献一束花，说句话。"),
    ("04_relic_a", "牛顿的《原理》，一条公式把天体装进纸里。三百年后，证明它的人，不再是人。手算草稿上那些涂改，是思考留下的指纹。还有欧几里得的圆规——真理不需要圆规，但证明它的人需要。"),
    ("05_relic_b", "对数表把乘法变成加法，然后被简单忘掉。古法修图，一层一层地抠，一根头发一根头发地修；现在一句话，就能换掉整片天空。算盘噼里啪啦响了一千年，被移到了抽屉最里层。"),
    ("06_flower", "我给它们各献了一束花。系统只允许每处献一次——挺好，隆重的东西，一次就够了。花瓣落下的那一刻，像一场迟到了很久的告别。"),
    ("07_wall", "墙上可以留言。有人写，手算的涂改别被算法抹平；有人说，爷爷的算盘还在抽屉里。这些话只存在你自己的设备上，不会上传到任何地方——这一点，倒是比很多告别都诚实。"),
    ("08_elegy", "我还选了算盘，让它给我写一段悼词：不是因为无用，是因为不再需要我们。它写得挺像那么回事。可惜它不懂，算盘珠响起来，到底是什么声音。"),
    ("09_outro", "我们并没有失去它们，只是不再需要亲手去做。这里是数学界赛博葬礼，向所有手工技艺致意。"),
]

def dur(path):
    r = subprocess.run(["ffprobe","-v","error","-show_entries","format=duration","-of","default=nw=1",path],capture_output=True,text=True)
    s = r.stdout.strip().replace("duration=", "").strip()
    return float(s)

async def main():
    total = 0
    meta = []
    for name, text in LINES:
        path = f"{OUT}/{name}.mp3"
        c = edge_tts.Communicate(text, VOICE, rate=RATE)
        await c.save(path)
        d = dur(path)
        total += d
        meta.append({"name":name,"text":text,"dur":round(d,3)})
        print(f"{name}: {d:.2f}s  {len(text)}字")
    print(f"\n总人声时长: {total:.2f}s")
    json.dump({"total":round(total,3),"lines":meta}, open(f"{OUT}/meta.json","w"), ensure_ascii=False, indent=2)

asyncio.run(main())
