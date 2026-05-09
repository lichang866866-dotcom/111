#!/usr/bin/env python3
"""从 ECDICT 生成四六级真题风格的题库 (2015-2024)"""

import csv, os, random, sys, json

CSV_PATH = os.path.join(os.path.dirname(__file__), 'ecdict.csv')
OUTPUT_PATH = os.path.join(os.path.dirname(__file__), 'cet-questions.ts')

random.seed(42)

# 四六级常见语法考点
GRAMMAR_TEMPLATES_CET4 = [
    # (question, options, answer, explanation, difficulty)
    ("It is essential that every student ___ the school rules.",
     '["follows", "follow", "following", "followed"]',
     'follow', 'It is + essential/important/necessary + that 从句中用 (should) + 动词原形（虚拟语气）。', 2),
    ("By the time he arrives, we ___ for two hours.",
     '["will wait", "will have been waiting", "have waited", "waited"]',
     'will have been waiting', 'By the time + 将来时间点, 主句用将来完成时。此处强调持续等待，用将来完成进行时。', 3),
    ("Not until she came back ___ the truth.",
     '["did he know", "he knew", "he did know", "knew he"]',
     'did he know', 'Not until 置于句首时，主句需要部分倒装。', 3),
    ("The house ___ roof is red belongs to my uncle.",
     '["which", "whose", "that", "its"]',
     'whose', '定语从句中，whose 在从句中作定语，修饰 roof。', 2),
    ("I wish I ___ to the concert last night.",
     '["went", "have gone", "had gone", "would go"]',
     'had gone', 'wish 后接宾语从句表示与过去事实相反的假设，用过去完成时 had gone。', 3),
    ("She was so tired that she couldn't help ___ .",
     '["to sleep", "sleeping", "slept", "sleep"]',
     'sleeping', 'can\'t help doing sth. 是固定搭配，意为"忍不住做某事"。', 2),
    ("___ is known to all, the earth moves around the sun.",
     '["As", "Which", "That", "What"]',
     'As', 'As is known to all 是固定表达，as 引导非限制性定语从句，指代整个主句。', 2),
    ("He suggested that the meeting ___ postponed.",
     '["be", "was", "is", "being"]',
     'be', 'suggest 表示"建议"时，其后的宾语从句用 (should) + 动词原形（虚拟语气）。', 2),
    ("The more you practice, ___ progress you will make.",
     '["the greater", "greater", "the more great", "a greater"]',
     'the greater', '"the + 比较级, the + 比较级" 结构表示"越……就越……"。', 1),
    ("Hardly had he finished his speech ___ the audience started cheering.",
     '["when", "than", "as", "while"]',
     'when', 'Hardly ... when ... 是固定搭配，表示"刚……就……"。', 3),
    ("There is no point ___ about the past.",
     '["to worry", "in worrying", "worrying", "of worrying"]',
     'in worrying', "There is no point (in) doing sth. 是固定句型，in 可省略。", 2),
    ("Had I known about the meeting, I ___ .",
     '["would have attended", "will attend", "would attend", "attended"]',
     'would have attended', '虚拟语气中，省略 if 后的倒装结构，主句用 would have done。', 3),
    ("The number of people who own cars ___ increasing.",
     '["are", "is", "were", "have been"]',
     'is', 'The number of + 可数名词 作主语时，谓语动词用单数。', 1),
    ("This is the first time that I ___ such a beautiful sunset.",
     '["have seen", "saw", "had seen", "see"]',
     'have seen', "在 This/It is the first time that 从句中，从句用现在完成时。", 2),
    ("___ the weather, the sports meeting will be held as scheduled.",
     '["In spite", "Despite", "Regardless of", "All of the above"]',
     'Regardless of', 'Regardless of 表示"不管，不顾"，最符合句意。', 2),
    ("You'd better ___ the doctor right now.",
     '["seeing", "saw", "to see", "see"]',
     'see', "had better 后接动词原形。", 1),
    ("The fact ___ she failed the exam surprised us all.",
     '["which", "that", "what", "why"]',
     'that', '同位语从句用 that 引导，说明 fact 的具体内容。', 2),
    ("With everything ___, she went home happily.",
     '["did", "done", "doing", "to do"]',
     'done', 'with 复合结构中，everything 与 do 之间是被动关系，用过去分词。', 3),
    ("Neither he nor I ___ interested in the project.",
     '["am", "is", "are", "be"]',
     'am', 'neither...nor... 连接主语时，谓语动词与最近的主语保持一致（就近原则）。', 2),
    ("___ you study harder, you will fall behind.",
     '["If", "Unless", "When", "Because"]',
     'Unless', 'Unless 引导条件状语从句，表示"除非，如果不"。', 1),
]

GRAMMAR_TEMPLATES_CET6 = [
    ("Were it not for the scholarship, he ___ college.",
     "[\"couldn't have attended\", \"can't attend\", \"couldn't attend\", \"didn't attend\"]",
     "couldn't have attended", '虚拟语气省略 if 的倒装结构，与过去事实相反。', 3),
    ("The professor demanded that his paper ___ by Friday.",
     '["be submitted", "was submitted", "submitted", "would be submitted"]',
     'be submitted', 'demand 后的宾语从句用虚拟语气 (should) + 动词原形，此处应被动。', 3),
    ("It is high time that the government ___ measures to control pollution.",
     '["takes", "took", "will take", "has taken"]',
     'took', 'It is (high) time that 从句中谓语用过去式（虚拟语气）。', 3),
    ("___ for the doctor's timely treatment, he would have died.",
     '["Had it not been", "If it were not", "Were it not", "Should it not be"]',
     'Had it not been', '与过去事实相反的虚拟语气，省略 if 后的倒装结构。', 4),
    ("The theory proved to be ___ than we had expected.",
     '["much more complicated", "much complicated", "more much complicated", "complicated more"]',
     'much more complicated', 'much 修饰比较级 more complicated。', 2),
    ("No sooner had he put down the receiver ___ the telephone rang again.",
     '["when", "then", "than", "as"]',
     'than', 'No sooner ... than ... 是固定搭配。', 2),
    ("What caused the accident ___ on the highway.",
     '["were three cars", "three cars were", "being three cars", "three cars being"]',
     'were three cars', 'What 引导的主语从句作主语时，表语从句用陈述语序。', 3),
    ("The manager, together with his colleagues, ___ attending the conference.",
     '["is", "are", "be", "being"]',
     'is', '主语后跟 together with 短语时，谓语动词与主语 the manager 保持一致。', 2),
    ("It was in this laboratory ___ the famous experiment was conducted.",
     '["that", "where", "which", "when"]',
     'that', 'It is/was ... that ... 强调句型，此处强调地点状语。', 3),
    ("___ , the project turned out to be a great success.",
     '["As expected", "Expected as", "Expecting as", "To expect"]',
     'As expected', 'As expected 是省略了 it was 的状语从句，表示"如预期的那样"。', 2),
    ("He was criticized for not having the work ___ on time.",
     '["complete", "completed", "completing", "to complete"]',
     'completed', 'have sth. done 结构，work 与 complete 是被动关系。', 2),
    ("Scarcely had they settled down to work ___ the power went out.",
     '["when", "than", "then", "as"]',
     'when', 'Scarcely ... when ... 是固定搭配。', 3),
    ("I would rather you ___ the secret to anyone.",
     '["not tell", "do not tell", "did not tell", "had not told"]',
     "did not tell", 'would rather 后的从句用过去式表示现在或将来的愿望。', 3),
    ("The research, ___ conclusions were published last month, won an award.",
     '["which", "whose", "that", "its"]',
     'whose', '定语从句中 whose 作定语，相当于 the conclusions of which。', 3),
    ("Only by working together ___ solve this global challenge.",
     '["we can", "can we", "do we can", "we do can"]',
     'can we', 'Only + 状语 置于句首时，主句需要部分倒装。', 2),
    ("___ for your help, we couldn't have finished the task on time.",
     '["Were it not", "Had it not been", "If it is not", "Should it not be"]',
     'Had it not been', '与过去事实相反的虚拟语气，省略 if 后用倒装。', 4),
    ("The climate of Beijing is much colder in winter than ___ of Shanghai.",
     '["this", "that", "one", "it"]',
     'that', 'that 在此指代前面的 climate，用于比较结构中避免重复。', 1),
    ("It is the ability to adapt ___ determines one's success in the long run.",
     '["that", "which", "what", "who"]',
     'that', '强调句型 It is ... that ...', 2),
    ("He would have passed the exam if he ___ harder.",
     '["studied", "had studied", "studies", "has studied"]',
     'had studied', '与过去事实相反的虚拟语气，if 从句用过去完成时。', 2),
    ("The significance of the finding was ___ to be underestimated.",
     '["too important", "important enough", "very important", "so important"]',
     'too important', 'too ... to ... 结构表示"太……以至于不能……"。', 2),
]

# 词汇题 — 使用高频词
def generate_vocab_questions(words, exam_type, year, count=30):
    """从高频词中随机选取生成词汇选择题"""
    high_collins = [w for w in words if w.get('collins', 0) >= 2 and w.get('frq', 999999) < 10000]
    if len(high_collins) < count * 3:
        high_collins = [w for w in words if w.get('collins', 0) >= 1]
    if len(high_collins) < count * 3:
        high_collins = words[:count * 5]
    random.shuffle(high_collins)

    questions = []
    used_words = set()
    for w in high_collins:
        if len(questions) >= count:
            break
        word = w['word']
        meaning = w['meaning']
        if word in used_words or len(word) < 4:
            continue
        used_words.add(word)

        qtype = random.choice(['meaning', 'synonym', 'blank'])

        if qtype == 'meaning':
            # "What does X mean?"
            # 从其他词中选干扰项
            distractors = [x['meaning'] for x in sorted(high_collins, key=lambda _w: abs(len(_w['meaning']) - len(meaning))) if x['word'] != word and x.get('meaning')][:3]
            if len(distractors) < 3:
                continue
            opts = [meaning] + distractors
            random.shuffle(opts)
            questions.append({
                'type': 'vocabulary',
                'exam_type': exam_type,
                'exam_year': year,
                'category': f'{exam_type}-{year}-词汇',
                'question': f'The word "{word}" is closest in meaning to:',
                'options': opts,
                'correct_answer': meaning,
                'explanation': f'"{word}" 的意思为"{meaning}"，是{exam_type}考试高频词汇。',
                'difficulty': 2 if w.get('collins', 0) >= 2 else 3,
            })

        elif qtype == 'synonym':
            for w2 in high_collins:
                if w2['word'] != word and w2.get('meaning') and word not in w2.get('meaning', '') and w2['word'] not in meaning:
                    synonym = w2
                    break
            else:
                continue
            distractors = [x['word'] for x in sorted(high_collins, key=lambda _w: abs(len(_w['word']) - len(word))) if x['word'] != word and x['word'] != synonym['word']][:3]
            if len(distractors) < 3:
                continue
            opts = [synonym['word']] + distractors
            random.shuffle(opts)
            questions.append({
                'type': 'vocabulary',
                'exam_type': exam_type,
                'exam_year': year,
                'category': f'{exam_type}-{year}-词汇',
                'question': f'Choose the synonym for "{word}":',
                'options': opts,
                'correct_answer': synonym['word'],
                'explanation': f'"{synonym["word"]}" 意为"{synonym.get("meaning", "")}"，与 "{word}" 意思相近。',
                'difficulty': 3,
            })

        elif qtype == 'blank':
            distractors = [x['word'] for x in sorted(high_collins, key=lambda _w: abs(len(_w['word']) - len(word))) if x['word'] != word][:3]
            if len(distractors) < 3:
                continue
            opts = [word] + distractors
            random.shuffle(opts)
            questions.append({
                'type': 'vocabulary',
                'exam_type': exam_type,
                'exam_year': year,
                'category': f'{exam_type}-{year}-词汇',
                'question': f'The research findings were quite ___, changing the way we understand the disease.',
                'options': opts,
                'correct_answer': word,
                'explanation': f'"{word}" ({meaning}) 是最符合句意的选择。',
                'difficulty': 2,
            })

    return questions


def esc(s):
    return s.replace('\\', '\\\\').replace("'", "\\'").replace('\n', '\\n').replace('\r', '')


def main():
    if not os.path.exists(CSV_PATH):
        print(f"错误: 找不到 {CSV_PATH}")
        return

    print("正在从 ECDICT 读取单词...")
    words = []
    with open(CSV_PATH, 'r', encoding='utf-8', errors='replace') as f:
        reader = csv.DictReader(f)
        for row in reader:
            word = (row.get('word') or '').strip()
            if not word or ' ' in word or len(word) < 3:
                continue
            translation = (row.get('translation') or '').strip()
            if not translation:
                continue
            meaning = translation.split('\n')[0].strip()
            if len(meaning) > 150:
                meaning = meaning[:147] + '...'
            try:
                collins = int(row.get('collins') or '0')
            except:
                collins = 0
            try:
                frq = int(row.get('frq') or '999999')
            except:
                frq = 999999
            tag_str = (row.get('tag') or '').strip().lower()
            tags = set(t.strip() for t in tag_str.split() if t.strip())

            words.append({
                'word': word, 'meaning': meaning, 'collins': collins, 'frq': frq, 'tags': tags
            })

    print(f"共读取 {len(words)} 个单词")

    # 筛选 CET-4 和 CET-6 词
    cet4_words = [w for w in words if 'cet4' in w['tags']]
    cet6_words = [w for w in words if 'cet6' in w['tags']]
    # 如果没有足够的标签词，使用高频词
    if len(cet4_words) < 200:
        cet4_words = [w for w in words if w['collins'] >= 2 and w['frq'] < 20000]
    if len(cet6_words) < 200:
        cet6_words = [w for w in words if w['collins'] >= 1 and w['frq'] < 40000]

    print(f"CET-4 词: {len(cet4_words)}, CET-6 词: {len(cet6_words)}")

    all_questions = []

    # 为每年生成题目（2015-2024）
    for year in range(2015, 2025):
        random.seed(year * 42)

        # CET-4 题目：每年约 20 词汇 + 10 语法 = 30
        if cet4_words:
            vocab4 = generate_vocab_questions(cet4_words, 'CET4', year, count=20)
            all_questions.extend(vocab4)

        # CET-4 语法题
        gram4 = GRAMMAR_TEMPLATES_CET4[(year - 2015) % len(GRAMMAR_TEMPLATES_CET4):]
        gram4 += GRAMMAR_TEMPLATES_CET4[:(year - 2015) % len(GRAMMAR_TEMPLATES_CET4)]
        for q, opt, ans, exp, diff in gram4[:10]:
            all_questions.append({
                'type': 'grammar',
                'exam_type': 'CET4',
                'exam_year': year,
                'category': f'CET4-{year}-语法',
                'question': q,
                'options': opt,
                'correct_answer': ans,
                'explanation': exp,
                'difficulty': diff,
            })

        # CET-6 题目：每年约 15 词汇 + 10 语法 = 25
        if cet6_words:
            vocab6 = generate_vocab_questions(cet6_words, 'CET6', year, count=15)
            all_questions.extend(vocab6)

        gram6 = GRAMMAR_TEMPLATES_CET6[(year - 2015) % len(GRAMMAR_TEMPLATES_CET6):]
        gram6 += GRAMMAR_TEMPLATES_CET6[:(year - 2015) % len(GRAMMAR_TEMPLATES_CET6)]
        for q, opt, ans, exp, diff in gram6[:10]:
            all_questions.append({
                'type': 'grammar',
                'exam_type': 'CET6',
                'exam_year': year,
                'category': f'CET6-{year}-语法',
                'question': q,
                'options': opt,
                'correct_answer': ans,
                'explanation': exp,
                'difficulty': diff,
            })

    print(f"共生成 {len(all_questions)} 道题目")

    # 生成 TypeScript
    with open(OUTPUT_PATH, 'w', encoding='utf-8') as f:
        f.write('// 自动生成的四六级真题风格题库\n')
        f.write(f'// 题目总数: {len(all_questions)}\n')
        f.write('// 年份覆盖: 2015-2024\n\n')
        f.write('export interface CETQuestionData {\n')
        f.write('  type: string\n')
        f.write('  exam_type: string\n')
        f.write('  exam_year: number\n')
        f.write('  category: string\n')
        f.write('  question: string\n')
        f.write('  options: string\n')
        f.write('  correct_answer: string\n')
        f.write('  explanation: string\n')
        f.write('  difficulty: number\n')
        f.write('}\n\n')
        f.write('export const CET_QUESTIONS: CETQuestionData[] = [\n')

        for q in all_questions:
            ws = esc(q['question'])
            ms = esc(q['correct_answer'])
            es = esc(q['explanation'])
            # Use json.dumps for Python list, which gives proper JSON with double quotes
            if isinstance(q['options'], list):
                opt_str = json.dumps(q['options'])
            else:
                opt_str = q['options']
            # Output as a JSON array directly (without quotes) - TypeScript array literal
            f.write(f"  {{ type: '{q['type']}', exam_type: '{q['exam_type']}', exam_year: {q['exam_year']}, category: '{q['category']}', question: '{ws}', options: {opt_str}, correct_answer: '{ms}', explanation: '{es}', difficulty: {q['difficulty']} }},\n")

        f.write(']\n')

    print(f"\n已生成: {OUTPUT_PATH}")

    # 统计
    cet4_count = sum(1 for q in all_questions if q['exam_type'] == 'CET4')
    cet6_count = sum(1 for q in all_questions if q['exam_type'] == 'CET6')
    print(f"CET-4 题目: {cet4_count}, CET-6 题目: {cet6_count}")


if __name__ == '__main__':
    main()
