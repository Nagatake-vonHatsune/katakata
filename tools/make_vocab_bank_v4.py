"""One-off: build Vocab Bank v4 from v3 by appending five colloquial Dunia scenes.

Usage: python3 -I tools/make_vocab_bank_v4.py <v3.xlsx> <out-v4.xlsx>

Sam, 6 Nov 2026: "populate kata kata vocab with more colloquial common parlance ... simpulan bahasa,
body parts ... The goal is to build common local speakers not dictionary brains."

All new rows are Claude drafts (Malay and Japanese) for Sam to review. Idioms were checked against
Kamus Dewan Edisi Keempat (page references go in the Malay ledger, never its definitions).
Body words are spread over two scenes (face in Gambar bayi, arms and legs in Main badminton) so
similar words don't blur together, and the idioms come last so they reuse those words.
"""
import sys
import openpyxl

# (Malay, English, Japanese draft, POS, affix tag, hook type, hook text)
SCENES = [
    {
        "id": "lepak-mamak", "world": "Makan Luar (Eating out)", "scene": "Lepak di kedai mamak",
        "english": "Hanging out at the mamak", "primes": 5,
        "setting": "After futsal, Tanaka's colleagues take him to a 24-hour mamak for teh tarik and roti canai.",
        "words": [
            ("mamak", "mamak stall (Indian-Muslim eatery, often open late)", "ママッ（インド系ムスリムの大衆食堂、深夜営業も多い）", "noun", "root", None, None),
            ("lepak", "to hang out, chill", "ぶらぶらする・だべる", "verb", "root", None, None),
            ("sembang", "to chat", "おしゃべりする", "verb", "root", None, None),
            ("teh tarik", "pulled milk tea", "テ・タリッ（泡立てたミルクティー）", "noun", "chunk", "kanji", "teh (tea) + tarik (pull): the tea is 'pulled', poured from cup to cup until it froths. The same tarik as in tarik duit."),
            ("roti canai", "roti canai (flaky flatbread with curry)", "ロティ・チャナイ（カレーで食べる薄焼きパン）", "noun", "chunk", None, None),
            ("kopi O", "black coffee (with sugar)", "ブラックコーヒー（砂糖入り）", "noun", "chunk", "pinjam", "O is from Hokkien 烏 'black'. Kopi O kosong = no sugar either."),
            ("tapau", "to take away (food)", "持ち帰りにする", "verb", "root", "pinjam", "From Cantonese 打包 'pack up'; everyone in Malaysia says it. Same job as bungkus (Ch8)."),
            ("makan sini", "to eat here (dine in)", "店内で食べる", "phrase", "chunk", "kanji", "makan (eat) + sini (here). The waiter asks: Makan sini atau tapau?"),
            ("boleh tahan", "not bad, pretty good", "なかなかいい・けっこういける", "phrase", "chunk", "kanji", "boleh (can, Ch2) + tahan (bear): 'bearable'. Said with a nod, it is real praise."),
            ("tak apa", "never mind, it's OK", "大丈夫・気にしないで", "phrase", "chunk", "kanji", "tak (not) + apa (what): 'it's nothing'. Often said takpe."),
            ("kira", "to count; Kira! = the bill, please", "数える・（店で）お会計", "verb", "root", None, None),
            ("abang", "older brother; friendly way to call a waiter", "兄・（店員への呼びかけ）お兄さん", "noun", "root", "keluarga", "Family word used for strangers too, often cut to bang: Bang, teh tarik satu!"),
        ],
    },
    {
        "id": "pejabat-sembang", "world": "Pejabat (Office)", "scene": "Sembang di pantri",
        "english": "Chatting in the pantry", "primes": 2,
        "setting": "Monday morning in the office pantry: the team catches up on the weekend.",
        "words": [
            ("alamak", "oh no!, oops", "しまった！・あらら", "interj", "root", "bunyi", "Sounds a little like あらまあ, and means much the same."),
            ("wah", "wow", "わあ！", "interj", "root", "bunyi", "Same as わあ."),
            ("betul ke?", "really?", "本当？", "phrase", "chunk", "kanji", "betul (true, right) + ke (spoken question marker): 'true?'"),
            ("mana ada", "not at all, no way (brushing something off)", "そんなことないよ", "phrase", "chunk", "kanji", "mana (where) + ada (there is): 'where is there (any)?' The answer to a compliment: Mana ada!"),
            ("jangan risau", "don't worry", "心配しないで", "phrase", "chunk", "keluarga", "risau = worried (Ch5); jangan = don't."),
            ("lama tak jumpa", "long time no see", "久しぶり", "phrase", "chunk", "kanji", "lama (long time, Ch7) + tak (not) + jumpa (meet, Ch1): word for word 'long time no see'."),
            ("sikit je", "just a little", "ちょっとだけ", "phrase", "chunk", "keluarga", "The short spoken forms: sikit = sedikit, je = saja."),
            ("kot / kut", "maybe, I think (at the end of a sentence)", "〜かな・たぶん", "particle", "root", None, None),
            ("best", "great, awesome", "最高・すごくいい", "adj", "root", "pinjam", "From English 'best', but it just means great: Filem tu best!"),
            ("syok", "really fun, enjoyable", "楽しい・気持ちいい", "adj", "root", None, None),
            ("geng", "group of friends, crew", "仲間・グループ", "noun", "root", "pinjam", "From English 'gang', with no bad meaning: geng makan = lunch crew."),
            ("tumpang lalu", "excuse me, may I get past", "すみません、通ります", "phrase", "chunk", "keluarga", "The same tumpang as Tumpang tanya (Ch1): 'let me share the way'."),
        ],
    },
    {
        "id": "badan-bayi", "world": "Badan (Body)", "scene": "Gambar bayi",
        "english": "Baby photos", "primes": 5,
        "setting": "Aini shows the team photos of her new baby. Whose nose? Whose eyes?",
        "words": [
            ("bayi", "baby", "赤ちゃん", "noun", "root", None, None),
            ("comel", "cute", "かわいい", "adj", "root", None, None),
            ("tembam", "chubby (cheeks, face)", "ぽっちゃりした・ふっくらした", "adj", "root", None, None),
            ("muka", "face", "顔", "noun", "root", None, None),
            ("hidung", "nose", "鼻", "noun", "root", None, None),
            ("mulut", "mouth", "口", "noun", "root", None, None),
            ("telinga", "ear", "耳", "noun", "root", None, None),
            ("pipi", "cheek", "ほお", "noun", "root", None, None),
            ("rambut", "hair (on the head)", "髪", "noun", "root", None, None),
            ("jari", "finger", "指", "noun", "root", None, None),
            ("senyum", "to smile; a smile", "ほほえむ・笑顔", "verb", "root", None, None),
            ("macam", "like, similar to (spoken)", "〜みたい・〜のような", "prep", "root", None, None),
        ],
    },
    {
        "id": "sukan-badminton", "world": "Sukan (Sport)", "scene": "Main badminton",
        "english": "Playing badminton", "primes": 6,
        "setting": "Saturday badminton with the office team. Tanaka is keen, but his arms and knees disagree.",
        "words": [
            ("badminton", "badminton (also: bulu tangkis)", "バドミントン", "noun", "root", "pinjam", "From English. The Malay word bulu tangkis is also used."),
            ("raket", "racket", "ラケット", "noun", "root", "pinjam", "From English 'racket', like ラケット."),
            ("gelanggang", "court (for sport)", "コート（競技場）", "noun", "root", None, None),
            ("skor", "score", "点数・スコア", "noun", "root", "pinjam", "From English 'score'."),
            ("lompat", "to jump", "跳ぶ", "verb", "root", None, None),
            ("kalah", "to lose (a game)", "負ける", "verb", "root", None, None),
            ("juara", "champion", "優勝者・チャンピオン", "noun", "root", None, None),
            ("peluh", "sweat", "汗", "noun", "root", None, None),
            ("tangan", "hand", "手", "noun", "root", None, None),
            ("lengan", "arm", "腕", "noun", "root", None, None),
            ("bahu", "shoulder", "肩", "noun", "root", None, None),
            ("siku", "elbow", "ひじ", "noun", "root", None, None),
            ("lutut", "knee", "ひざ", "noun", "root", None, None),
            ("pinggang", "waist, lower back", "腰", "noun", "root", None, None),
        ],
    },
    {
        "id": "simpulan-harian", "world": "Simpulan Bahasa (Idioms)", "scene": "Simpulan bahasa harian",
        "english": "Everyday idioms", "primes": 9,
        "setting": "Over lunch, Encik Rahman describes the office in idioms. Most are built from body words, so each one is a picture.",
        "words": [
            ("kepala batu", "stubborn (person)", "頑固（な人）", "adj", "chunk", "kanji", "kepala (head) + batu (stone): 'stone head', just like 石頭・頭が固い."),
            ("besar kepala", "big-headed, arrogant", "思い上がった・天狗になった", "adj", "chunk", "kanji", "besar (big, Ch5) + kepala (head): 'big head', as in English. In Japanese: 天狗になる."),
            ("ringan tulang", "hard-working, always ready to help", "働き者・まめな", "adj", "chunk", "kanji", "ringan (light, Ch5) + tulang (bone): light bones get up and help. The opposite is berat tulang (lazy)."),
            ("panjang tangan", "light-fingered, likely to steal", "手癖が悪い", "adj", "chunk", "kanji", "panjang (long, Ch3) + tangan (hand): Japanese says it the same way, 手が長い."),
            ("buah hati", "darling, sweetheart (often your child)", "最愛の人・いとしい子", "noun", "chunk", "kanji", "buah (fruit, Ch8) + hati (heart): 'fruit of the heart'."),
            ("buah tangan", "a gift you bring when visiting", "手土産", "noun", "chunk", "kanji", "buah (fruit) + tangan (hand): what you carry in your hand, exactly 手土産."),
            ("mulut murai", "chatterbox", "おしゃべりな人", "noun", "chunk", "kanji", "mulut (mouth) + murai (magpie robin, a very noisy bird)."),
            ("kaki bangku", "hopeless at football (or sport)", "サッカーが下手な人・運動音痴", "noun", "chunk", "kanji", "kaki (leg, Ch8) + bangku (bench): legs as stiff as a bench's."),
            ("mata duitan", "money-minded, greedy for money", "金に目がない", "adj", "chunk", "kanji", "mata (eye) + duit (money) + -an: eyes full of money, like 金に目がない."),
            ("sakit hati", "hurt and annoyed", "腹が立つ・心が傷つく", "adj", "chunk", "kanji", "sakit (sick, Ch5) + hati (heart, liver): a sore heart."),
            ("jangan ambil hati", "don't take it to heart", "気を悪くしないで", "phrase", "chunk", "kanji", "jangan (don't) + ambil (take) + hati (heart): word for word 'don't take it to heart'."),
            ("air muka", "look on your face; face (pride)", "顔色・表情；面目", "noun", "chunk", "kanji", "air (water, Ch5) + muka (face). jaga air muka = to save face (面子を保つ)."),
            ("tangan kosong", "empty-handed", "手ぶら", "adj", "chunk", "kanji", "tangan (hand) + kosong (empty): 手ぶら. Never go to an open house tangan kosong!"),
            ("cakar ayam", "messy handwriting", "ひどく汚い字", "noun", "chunk", "kanji", "cakar (claw, scratch) + ayam (chicken, Ch8): chicken scratches, like ミミズが這ったような字."),
        ],
    },
]


# Words the class track already teaches (shown with the "seen in class" chip).
SEEN_IN_CLASS = {"ms-d-lepak-mamak-12": "Ch1"}  # abang: Ch1 "Abang / Kakak (Kak)"


def main(src, out):
    wb = openpyxl.load_workbook(src)
    ds, di = wb["Dunia scenes"], wb["Dunia index"]
    for s in SCENES:
        for i, (ms, en, ja, pos, tag, ht, hook) in enumerate(s["words"], 1):
            cid = f"ms-d-{s['id']}-{i:02d}"
            ds.append([cid, s["world"], f"{s['scene']} ({s['english']})", s["primes"], ms, en, ja, pos, tag, ht, hook, SEEN_IN_CLASS.get(cid), f"katakata::ms::dunia::{s['id']}"])
        di.append([s["id"], s["world"], s["scene"], s["english"], s["primes"], len(s["words"]), s["setting"]])
    wb["README"]["A1"] = (
        "Kata-Kata: Malay Vocab Bank v4 (6 Nov 2026). v3 added four Dunia scenes (bank-pos, cuti-pantai, telefon-baru, "
        "perayaan-raya); v4 adds five colloquial scenes (lepak-mamak, pejabat-sembang, badan-bayi, sukan-badminton, "
        "simpulan-harian). All Claude drafts: check before students see them."
    )
    wb.save(out)
    print("wrote", out, sum(len(s["words"]) for s in SCENES), "new words")


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2])
