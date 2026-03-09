from flask import Flask, render_template, request, jsonify
import requests
from syllable_breaker import break_into_syllables

app = Flask(__name__)

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/surahs')
def get_surahs():
    # Only fetch Juz Amma (78-114) for performance and focus
    try:
        response = requests.get('https://api.alquran.cloud/v1/surah')
        if response.status_code == 200:
            data = response.json()['data']
            juz_amma = [s for s in data if s['number'] >= 78 and s['number'] <= 114]
            return jsonify({'success': True, 'data': juz_amma})
        return jsonify({'success': False, 'error': 'Failed to fetch surahs'}), 500
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/surah/<int:surah_id>')
def get_surah(surah_id):
    try:
        response = requests.get(f'https://api.alquran.cloud/v1/surah/{surah_id}')
        if response.status_code == 200:
            surah_data = response.json()['data']
            # We will process syllables on the backend to simplify frontend logic
            processed_ayahs = []
            for ayah in surah_data['ayahs']:
                words = ayah['text'].split()
                processed_words = []
                for word in words:
                    # Break each word into syllables
                    syllables = break_into_syllables(word)
                    processed_words.append({
                        'word': word,
                        'syllables': syllables
                    })
                processed_ayahs.append({
                    'number': ayah['numberInSurah'],
                    'words': processed_words,
                    'text': ayah['text']
                })
            
            return jsonify({
                'success': True, 
                'data': {
                    'name': surah_data['name'],
                    'englishName': surah_data['englishName'],
                    'ayahs': processed_ayahs
                }
            })
        return jsonify({'success': False, 'error': 'Failed to fetch surah'}), 500
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True, port=3000)
