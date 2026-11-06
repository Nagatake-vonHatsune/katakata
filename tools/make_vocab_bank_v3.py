"""One-off: build Vocab Bank v3 from v2 by appending four new Dunia scenes.

Usage: python3 -I tools/make_vocab_bank_v3.py <v2.xlsx> <out-v3.xlsx>
All new rows are Claude drafts (Malay and Japanese) for Sam to review.
"""
import sys
import openpyxl

SCENES = [
    {
        "id": "bank-pos", "world": "Bank dan Pos (Bank and post)", "scene": "Ke bank dan pejabat pos",
        "english": "To the bank and post office", "primes": 3,
        "setting": "Tanaka opens a bank account, then posts a parcel home to Japan.",
        "words": [
            ("akaun", "account (bank)", "口座", "noun", "root", "pinjam", "From English 'account'."),
            ("borang", "form (to fill in)", "用紙・申込書", "noun", "root", None, None),
            ("isi", "to fill in; contents", "記入する・中身", "verb", "root", None, None),
            ("pasport", "passport", "パスポート", "noun", "root", "pinjam", "From English 'passport', like パスポート."),
            ("nombor giliran", "queue number", "順番待ちの番号", "noun", "chunk", "kanji", "nombor (number) + giliran (turn): 'turn number', like 番号札."),
            ("kaunter", "counter", "窓口・カウンター", "noun", "root", "pinjam", "From English 'counter', like カウンター."),
            ("tarik duit", "to withdraw money", "お金を引き出す", "phrase", "chunk", "kanji", "tarik (pull) + duit (money): 'pull out money', just like 引き出す. The same tarik as in teh tarik."),
            ("pejabat pos", "post office", "郵便局", "noun", "chunk", "kanji", "pejabat (office, Ch2) + pos (post): 'post office', like 郵便局."),
            ("surat", "letter", "手紙", "noun", "root", None, None),
            ("setem", "postage stamp", "切手", "noun", "root", "pinjam", "From English 'stamp'. Careful: Japanese スタンプ is a rubber stamp; setem is a postage stamp (切手)."),
            ("alamat", "address", "住所", "noun", "root", None, None),
            ("poskod", "postcode", "郵便番号", "noun", "root", "pinjam", "From English 'postcode'."),
            ("bungkusan", "parcel", "小包", "noun", "-an", "keluarga", "bungkus (wrap, Ch8) + -an: the wrapped thing."),
        ],
    },
    {
        "id": "cuti-pantai", "world": "Cuti (Holidays)", "scene": "Cuti ke pantai",
        "english": "A beach holiday", "primes": 4,
        "setting": "Tanaka plans a long weekend at the beach in Langkawi.",
        "words": [
            ("pantai", "beach", "海辺・ビーチ", "noun", "root", None, None),
            ("laut", "sea", "海", "noun", "root", None, None),
            ("pulau", "island", "島", "noun", "root", None, None),
            ("pasir", "sand", "砂", "noun", "root", None, None),
            ("hotel", "hotel", "ホテル", "noun", "root", "pinjam", "From English 'hotel', like ホテル."),
            ("tiket", "ticket", "チケット・切符", "noun", "root", "pinjam", "From English 'ticket', like チケット."),
            ("kapal terbang", "aeroplane", "飛行機", "noun", "chunk", "kanji", "kapal (ship) + terbang (fly): 'flying ship', like 飛行機."),
            ("lapangan terbang", "airport", "空港", "noun", "chunk", "kanji", "lapangan (field) + terbang (fly): 'flying field', like 飛行場."),
            ("tempah", "to book, reserve", "予約する", "verb", "root", None, None),
            ("peta", "map", "地図", "noun", "root", None, None),
            ("ambil gambar", "to take a photo", "写真を撮る", "phrase", "chunk", "kanji", "ambil (take) + gambar (picture): 'take a picture', built like 写真を撮る."),
            ("cenderamata", "souvenir", "お土産", "noun", "root", None, None),
            ("seronok", "fun, enjoyable", "楽しい", "adj", "root", None, None),
        ],
    },
    {
        "id": "telefon-baru", "world": "Telefon (Phone)", "scene": "Telefon baru",
        "english": "A new phone", "primes": 7,
        "setting": "Tanaka's phone breaks just before a Grab ride, so he sets up a new one.",
        "words": [
            ("telefon bimbit", "mobile phone", "携帯電話", "noun", "chunk", "kanji", "telefon + bimbit (carry in the hand): 'carry phone', just like 携帯電話."),
            ("aplikasi", "app", "アプリ", "noun", "root", "pinjam", "From English 'application', like アプリ."),
            ("muat turun", "to download", "ダウンロードする", "verb", "chunk", "kanji", "muat (load) + turun (go down): 'load down', a word-for-word download."),
            ("kata laluan", "password", "パスワード", "noun", "chunk", "kanji", "kata (word) + laluan (way through): 'pass word'. The same kata as in Kata-Kata."),
            ("bateri", "battery", "バッテリー・電池", "noun", "root", "pinjam", "From English 'battery'."),
            ("cas", "to charge (a battery)", "充電する", "verb", "root", "pinjam", "From English 'charge': cas bateri."),
            ("skrin", "screen", "画面", "noun", "root", "pinjam", "From English 'screen', like スクリーン."),
            ("tekan", "to press, tap", "押す・タップする", "verb", "root", None, None),
            ("internet", "internet", "インターネット", "noun", "root", None, None),
            ("talian", "line, connection", "回線", "noun", "root", "keluarga", "From tali (rope, string): a phone line is a long string."),
            ("rosak", "broken, out of order", "壊れた・故障した", "adj", "root", None, None),
            ("kamera", "camera", "カメラ", "noun", "root", "pinjam", "From English 'camera', like カメラ."),
        ],
    },
    {
        "id": "perayaan-raya", "world": "Perayaan (Festivals)", "scene": "Rumah terbuka Hari Raya",
        "english": "A Hari Raya open house", "primes": 9,
        "setting": "Encik Rahman invites Tanaka to his Hari Raya open house.",
        "words": [
            ("Hari Raya", "Hari Raya (the festival at the end of Ramadan)", "ハリラヤ（断食明けの祭り）", "noun", "chunk", None, None),
            ("Selamat Hari Raya", "Happy Hari Raya", "ハリラヤおめでとう", "phrase", "chunk", "keluarga", "The same selamat as Selamat pagi (Ch1)."),
            ("maaf zahir dan batin", "forgive me, outwardly and inwardly (Raya greeting)", "これまでの非礼をお許しください（ハリラヤの挨拶）", "phrase", "chunk", None, None),
            ("rumah terbuka", "open house", "オープンハウス（誰でも招く集まり）", "noun", "chunk", "kanji", "rumah (house) + terbuka (open): 'open house'."),
            ("jemput", "to invite; please (help yourself)", "招く・どうぞ", "verb", "root", None, None),
            ("tetamu", "guest", "客", "noun", "root", "keluarga", "The same 'guest' as tamu in ruang tamu (living room)."),
            ("ketupat", "ketupat (rice cooked in a woven palm-leaf case)", "クトゥパット（ヤシの葉で編んだ袋で炊いた米）", "noun", "root", None, None),
            ("rendang", "rendang (slow-cooked spiced meat)", "ルンダン（スパイスで煮込んだ肉料理）", "noun", "root", None, None),
            ("kuih", "traditional cakes and sweets", "クエ（伝統菓子）", "noun", "root", None, None),
            ("duit raya", "Raya money gift (for children)", "ハリラヤのお年玉", "noun", "chunk", "keluarga", "duit (money, Ch3) + raya: festival money, like お年玉."),
            ("pelita", "oil lamp", "灯油ランプ", "noun", "root", None, None),
            ("balik kampung", "to go back to your hometown", "帰省する", "phrase", "chunk", "kanji", "balik (go back) + kampung (hometown, Ch2): like 帰省."),
            ("baju Melayu", "baju Melayu (traditional Malay men's outfit)", "バジュ・ムラユ（男性の民族衣装）", "noun", "chunk", None, None),
        ],
    },
]


def main(src, out):
    wb = openpyxl.load_workbook(src)
    ds, di, ag = wb["Dunia scenes"], wb["Dunia index"], wb["Affix guard"]
    for s in SCENES:
        for i, (ms, en, ja, pos, tag, ht, hook) in enumerate(s["words"], 1):
            ds.append([f"ms-d-{s['id']}-{i:02d}", s["world"], f"{s['scene']} ({s['english']})", s["primes"], ms, en, ja, pos, tag, ht, hook, None, f"katakata::ms::dunia::{s['id']}"])
        di.append([s["id"], s["world"], s["scene"], s["english"], s["primes"], len(s["words"]), s["setting"]])
    ag.append(["ms-d-perayaan-raya-13", "Dunia", "baju Melayu", "Melayu", "tagged chunk", "PASS"])
    readme = wb["README"]
    readme["A1"] = "Kata-Kata: Malay Vocab Bank v3 (6 Nov 2026). v3 adds four Dunia scenes (Claude drafts, rows ms-d-bank-pos, cuti-pantai, telefon-baru, perayaan-raya): check before students see them."
    wb.save(out)
    print("wrote", out, sum(len(s["words"]) for s in SCENES), "new words")


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2])
