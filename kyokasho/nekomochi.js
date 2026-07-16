/* ==========================================================
   ねこもち占い 計算ロジック
   正典: 02_nekomochi-uranai/GPTs_システムプロンプト.md（Python版）のJS移植
   ルール:
     - 縮約: 2桁になったら各桁を足す（1桁になるまで）
     - マスターナンバー 11・22・33 はそのまま残す（コアナンバーのみ）
     - 個人年はマスターナンバーも1桁まで縮約する
     - 母音 = A・I・U・E・O（Yは子音）
   ========================================================== */

/** 12タイプのデータ（数秘 → ねこ） */
const NEKO_TYPES = {
  1:  { name: "いちばんねこ",  catch: "開拓・独立・リーダーシップ。「自分で決める」が生きがいの先駆者", kuchiguse: "まず、やってみよう！" },
  2:  { name: "なかよしねこ",  catch: "調和・協調・感受性。空気を読みすぎて疲れる平和主義者", kuchiguse: "まあ、いいよ" },
  3:  { name: "ひらめきねこ",  catch: "創造・表現・喜び。「楽しい！」だけで動く天性のエンターテイナー", kuchiguse: "これ、楽しそう！" },
  4:  { name: "こつこつねこ",  catch: "継続・誠実・土台。石橋を叩いて渡る、信頼の職人", kuchiguse: "ちゃんとやらなきゃ" },
  5:  { name: "ふわりねこ",    catch: "自由・変化・冒険。ルールと定番が苦手な自由な旅人", kuchiguse: "なんとかなる" },
  6:  { name: "まもりねこ",    catch: "愛情・責任・調和。守ることに生きがいを感じる大きなハート", kuchiguse: "私がやるよ" },
  7:  { name: "ふしぎねこ",    catch: "探求・内省・真理。「なぜ？」を掘り続ける孤高の哲学者", kuchiguse: "それって、本当？" },
  8:  { name: "まっすぐねこ",  catch: "達成・力・豊かさ。結果で証明したいパワフルな挑戦者", kuchiguse: "まだいける" },
  9:  { name: "あんしんねこ",  catch: "包容・共感・俯瞰。すべてを受け入れる、器の大きな賢者", kuchiguse: "大丈夫だよ" },
  11: { name: "ひかりねこ",    catch: "直感・啓蒙・橋渡し。見えないものを受け取る繊細なアンテナ", kuchiguse: "これ、違う気がする" },
  22: { name: "しっかりねこ",  catch: "構築・ビジョン・現実化。大きな夢を形にする建築家", kuchiguse: "まだ形になっていない" },
  33: { name: "まほうねこ",    catch: "無償の愛・癒やし・奇跡。常識を超えた愛で包む魔法使い", kuchiguse: "普通じゃなくていいよ" },
};

/** 役割スロットの定義（順番・色クラス・説明） */
const SLOTS = [
  { key: "lp", label: "❶ 本質のねこ（ライフパス）",       cls: "slot1", desc: "思考の土台。いちばん奥にいる素のあなた" },
  { key: "b",  label: "❷ 強みのねこ（バースデー）",       cls: "slot2", desc: "生まれつき自然に使える才能" },
  { key: "d",  label: "❸ 使命のねこ（ディスティニー）",   cls: "slot3", desc: "社会の中で担う役割" },
  { key: "s",  label: "❹ 本音のねこ（ソウル）",           cls: "slot4", desc: "心の奥がほんとうに満たされる瞬間" },
  { key: "p",  label: "❺ 見た目のねこ（パーソナリティ）", cls: "slot5", desc: "外から見える印象・第一印象" },
];

const VOWELS = "AIUEO";

/** 縮約: 11・22・33 は残して1桁まで足す */
function reduceNum(n) {
  while (n > 9 && n !== 11 && n !== 22 && n !== 33) {
    n = String(n).split("").reduce((a, c) => a + Number(c), 0);
  }
  return n;
}

/** 1桁まで必ず縮約（個人年用。マスターナンバーも残さない） */
function reduceToDigit(n) {
  while (n > 9) {
    n = String(n).split("").reduce((a, c) => a + Number(c), 0);
  }
  return n;
}

/** アルファベットの数秘値（ピタゴラス式 A=1…I=9, J=1…） */
function getCharValue(char) {
  if (char >= "A" && char <= "Z") {
    const val = (char.charCodeAt(0) - 64) % 9;
    return val === 0 ? 9 : val;
  }
  return 0;
}

/**
 * 5つのコアナンバーを計算する
 * @param {number} year  西暦4桁
 * @param {number} month 1-12
 * @param {number} day   1-31
 * @param {string} nameStr ローマ字名（空なら名前系はnull）
 */
function calcAllNumbers(year, month, day, nameStr) {
  const digits = (n) => String(n).split("").map(Number);

  // 本質のねこ（LP）: 生年月日の全数字
  const lp = reduceNum([...digits(year), ...digits(month), ...digits(day)].reduce((a, b) => a + b, 0));

  // 強みのねこ（B）: 生まれた「日」だけ
  const b = reduceNum(digits(day).reduce((a, c) => a + c, 0));

  const result = { lp, b, d: null, s: null, p: null, soulSum: 0, personalitySum: 0, letters: [] };

  const name = (nameStr || "").toUpperCase().replace(/[^A-Z]/g, "");
  if (name.length > 0) {
    let destinySum = 0, soulSum = 0, personalitySum = 0;
    for (const ch of name) {
      const val = getCharValue(ch);
      const isVowel = VOWELS.includes(ch);
      destinySum += val;
      if (isVowel) soulSum += val; else personalitySum += val;
      result.letters.push({ ch, val, isVowel });
    }
    result.d = reduceNum(destinySum);        // 使命のねこ
    result.s = reduceNum(soulSum);           // 本音のねこ
    result.p = reduceNum(personalitySum);    // 見た目のねこ
    result.soulSum = soulSum;
    result.personalitySum = personalitySum;
    // 検算: 母音合計＋子音合計を縮約すると必ずDに一致する
    result.kensanOk = reduceNum(soulSum + personalitySum) === result.d;
  }
  return result;
}

/** 個人年: 対象年の各桁＋誕生月＋誕生日の各桁 → 1桁まで縮約 */
function calcPersonalYear(targetYear, month, day) {
  const digits = (n) => String(n).split("").map(Number);
  return reduceToDigit([...digits(targetYear), ...digits(month), ...digits(day)].reduce((a, b) => a + b, 0));
}

/** きずなナンバー: ふたりのLPを足して縮約（11・22・33は残す） */
function calcKizuna(lp1, lp2) {
  return reduceNum(lp1 + lp2);
}

/** ふたりのLPの関係の型（第5章） */
function relationType(lp1, lp2) {
  const a = reduceToDigit(lp1), bb = reduceToDigit(lp2); // 型判定は1桁ベースで
  if (lp1 === lp2) return { name: "ミラー", desc: "価値観もスピードも似た者同士。最強コンビ。ただし譲らないときは火花が散ります" };
  if (a + bb === 10) return { name: "補完", desc: "持っていないものを補い合う、深いところで引き合う関係です" };
  if (Math.abs(a - bb) === 1) return { name: "隣り合わせ", desc: "波長が近く、自然体でいられる心地よい関係です" };
  return { name: "コントラスト", desc: "違うからこそ、ひとりでは見えない景色が広がる関係です。ズレたときは「なんで？」より、きずなナンバーを思い出してください" };
}

/* ---------- 表示ヘルパー ---------- */

/** 入力の検証。エラー文字列 or null を返す */
function validateBirth(year, month, day) {
  if (!year || !month || !day) return "生年月日（年・月・日）をすべて入れてください。";
  if (year < 1000 || year > 9999) return "年は西暦4桁で入れてください（例：1990）。";
  if (month < 1 || month > 12) return "月は1〜12で入れてください。";
  if (day < 1 || day > 31) return "日は1〜31で入れてください。";
  return null;
}

/** スロット色カード1枚のHTMLを作る */
function slotCardHTML(slot, num, linkToZukan) {
  const t = NEKO_TYPES[num];
  const img = "../img/cat_" + num + ".png";
  const more = linkToZukan
    ? '<div class="more"><a href="zukan.html#type-' + num + '">→ 図鑑でくわしく見る</a></div>'
    : '<div class="more"><a href="#type-' + num + '">→ この子の図鑑へ</a></div>';
  return (
    '<div class="slot-card ' + slot.cls + '">' +
      '<div class="num-badge">' + slot.label.slice(0, 1) + "</div>" +
      '<img src="' + img + '" alt="' + t.name + '">' +
      '<div class="body">' +
        '<div class="role">' + slot.label.slice(1).trim() + " — " + slot.desc + "</div>" +
        '<div class="neko-name"><span class="n">' + num + "</span>・" + t.name + "</div>" +
        '<div class="catch">' + t.catch + "</div>" + more +
      "</div>" +
    "</div>"
  );
}
