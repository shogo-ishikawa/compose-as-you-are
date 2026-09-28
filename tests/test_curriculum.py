"""Check all new starters, solutions, regressions and permissive alternatives."""
import json
from pathlib import Path
import sys
import unittest

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'assets' / 'python'))
from caya_assessment import run_submission

COURSE = json.loads((ROOT / 'assets' / 'data' / 'curriculum.json').read_text(encoding='utf-8'))
ACTIVITIES = {f"{lesson['id']}.{kind}": activity for lesson in COURSE['lessons']
              for kind, activity in lesson['activities'].items()}


class CurriculumTests(unittest.TestCase):
    def check_pass(self, code, task):
        result = run_submission(code, task)
        self.assertTrue(result['ok'], result)
        self.assertEqual(result['assessment']['status'], 'passed', result['assessment'])

    def test_all_examples_execute(self):
        for task, activity in ACTIVITIES.items():
            if task.endswith('.example'):
                with self.subTest(task=task):
                    result = run_submission(activity['code'], task)
                    self.assertTrue(result['ok'], result)
                    self.assertEqual(result['assessment']['status'], 'example')
                    self.assertFalse(result['assessment']['passed'])

    def test_all_fourteen_starters_are_incomplete(self):
        for task, activity in ACTIVITIES.items():
            if not task.endswith('.example'):
                with self.subTest(task=task):
                    result = run_submission(activity['code'], task)
                    self.assertFalse(result['ok'])
                    self.assertEqual(result['assessment']['status'], 'incomplete', result)
                    self.assertIsInstance(result['line'], int)
                    self.assertEqual(len(activity['hints']), 3)
                    self.assertTrue(activity['instructions'] and activity['expected'])

    def test_all_fourteen_reference_solutions_pass(self):
        for task, activity in ACTIVITIES.items():
            if 'solution' in activity:
                with self.subTest(task=task):
                    self.check_pass(activity['solution'], task)

    def test_comment_only_change_does_not_complete_starter(self):
        result = run_submission(ACTIVITIES['loops.practice']['code'] + '\n# for range if def\n', 'loops.practice')
        self.assertFalse(result['assessment']['passed'])

    def test_hard_coded_correct_initial_output_is_not_enough(self):
        code = ACTIVITIES['loops.practice']['solution'].replace('range(repeat_count)', 'range(8)')
        result = run_submission(code, 'loops.practice')
        self.assertTrue(result['ok'])
        self.assertFalse(result['assessment']['passed'])
        self.assertTrue(any(not item['passed'] for item in result['assessment']['checks']))

    def test_missing_rest_is_detected(self):
        code = ACTIVITIES['conditions.practice']['solution'].replace('add_rest(0.5)', 'pass')
        result = run_submission(code, 'conditions.practice')
        self.assertTrue(result['ok'])
        self.assertFalse(result['assessment']['passed'])

    def test_keyword_only_in_comment_is_not_a_for_statement(self):
        code = 'from caya_music import start_song, add_note\nrepeat_count = 8\nstart_song()\n# for i in range(repeat_count):\n' + 'add_note("C4", 0.5)\n' * 8
        result = run_submission(code, 'loops.practice')
        check = next(item for item in result['assessment']['checks'] if item['label'] == 'for文で繰り返す')
        self.assertFalse(check['passed'])

    def test_valid_alternative_list_multiplication(self):
        source = ACTIVITIES['functions.advanced']['solution']
        start = source.index('    result = []')
        end = source.index('\n\nsource_notes')
        source = source[:start] + '    return notes * repeats\n' + source[end:]
        self.check_pass(source, 'functions.advanced')

    def test_print_is_not_return(self):
        source = ACTIVITIES['functions.practice']['solution'].replace('return result', 'print(result)')
        result = run_submission(source, 'functions.practice')
        self.assertFalse(result['ok'])
        self.assertFalse(result['assessment']['passed'])

    def test_input_mutation_is_not_accepted(self):
        source = ACTIVITIES['functions.practice']['solution']
        start = source.index('    result = []')
        end = source.index('\n\nlengths')
        source = source[:start] + '    for i in range(len(lengths)):\n        lengths[i] *= factor\n    return lengths\n' + source[end:]
        result = run_submission(source, 'functions.practice')
        self.assertTrue(result['ok'])
        self.assertFalse(result['assessment']['passed'])

    def test_varied_creative_pitches_are_accepted(self):
        source = ACTIVITIES['arrangement.advanced']['solution']
        for old, new in [('C4', 'D4'), ('E4', 'F4'), ('G4', 'A4'), ('C5', 'D5'), ('C3', 'D3'), ('G3', 'A3')]:
            source = source.replace(old, new)
        self.check_pass(source, 'arrangement.advanced')

    def test_unknown_task_fails_closed(self):
        result = run_submission('print(1)', 'not-a-task')
        self.assertFalse(result['assessment']['passed'])
        self.assertEqual(result['assessment']['status'], 'check-error')

    def test_student_globals_are_not_reused(self):
        run_submission('secret_local = 7')
        result = run_submission('print(secret_local)')
        self.assertFalse(result['ok'])
        self.assertEqual(result['errorType'], 'NameError')

    def test_legacy_minimum_api_still_works(self):
        result = run_submission('def start_song(tempo, instrument, title):\n    begin_song(tempo, instrument, title)\ndef add_note(note, duration):\n    record_note(note, duration)\nstart_song(96, "bell", "legacy")\nadd_note("C4", 1)\n')
        self.assertTrue(result['ok'], result)
        self.assertIsNone(result['assessment'])

    def test_validation_does_not_change_the_audible_song(self):
        source = ACTIVITIES['arrangement.advanced']['solution']
        plain = run_submission(source)['song']
        assessed = run_submission(source, 'arrangement.advanced')['song']
        self.assertEqual(plain, assessed)

    def test_all_spica_topics_exist_in_known_mapping(self):
        ids = {'01-variables', '02-print', '03-fstrings', '04-list', '05-dict', '06-tuple', '07-methods',
               '08-math', '09-range', '10-for', '11-conditions', '12-if', '13-for-if', '14-def',
               '15-decompose-debug', '16-integrated', '23-matplotlib'}
        for lesson in COURSE['lessons']:
            self.assertTrue(all(link['id'] in ids for link in lesson['links']))


if __name__ == '__main__':
    unittest.main()
