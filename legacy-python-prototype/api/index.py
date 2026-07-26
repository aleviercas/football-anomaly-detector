# -*- coding: utf-8 -*-

from flask import Flask, request, jsonify, Response
from flask_cors import CORS
import sys
import os

# Añadir directorios al path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from models.anomaly_detector import AdvancedAnomalyDetector
from utils.statistical_utils import StatisticalUtils

app = Flask(__name__)
CORS(app)

# Inicializar detectores
detector = AdvancedAnomalyDetector()
stats_utils = StatisticalUtils()

@app.route('/api/analyze', methods=['POST'])
def analyze_match():
    """Endpoint principal de análisis de anomalías."""
    try:
        data = request.json or {}
        if not data:
            return jsonify({
                'success': False,
                'error': 'No data provided'
            }), 400

        league = data.get('league', 'premier_league')
        match_name = data.get('match_name', 'Partido sin nombre')
        competition = data.get('competition', league)

        # Si el usuario solo pasó el nombre del partido, construimos un perfil de ejemplo.
        if 'home_goals' not in data and 'away_goals' not in data:
            profile = build_match_profile(match_name, competition)
            data = {**profile, 'league': league, 'match_name': match_name, 'competition': competition}

        # Validar campos requeridos
        required_fields = ['home_goals', 'away_goals']
        missing_fields = [f for f in required_fields if f not in data]
        if missing_fields:
            return jsonify({
                'success': False,
                'error': f'Missing required fields: {", ".join(missing_fields)}'
            }), 400

        result = detector.analyze_match(data, league)

        if 'total_shots' in data and 'shots_on_target' in data:
            result['additional_metrics'] = {
                'shot_accuracy': round(
                    float(data['shots_on_target']) / max(float(data['total_shots']), 1) * 100, 1
                )
            }

        numeric_values = [
            float(v) for k, v in data.items()
            if isinstance(v, (int, float)) and v != 0
        ]
        if numeric_values:
            benford_score = stats_utils.benford_analysis(numeric_values)
            if benford_score > 15:
                result['data_integrity'] = {
                    'benford_score': round(benford_score, 2),
                    'warning': 'Posible manipulación de datos detectada por Ley de Benford'
                }

        result['match_context'] = {
            'match_name': match_name,
            'competition': competition,
            'league': league
        }

        return jsonify({
            'success': True,
            'data': result
        })

    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e),
            'type': type(e).__name__
        }), 500


def build_match_profile(match_name, competition):
    """Genera un perfil de ejemplo a partir del nombre del partido y la competición."""
    lowered = (match_name or '').lower()

    profiles = {
        'premier_league': {
            'home_goals': 3,
            'away_goals': 1,
            'possession_home': 58.0,
            'total_shots': 22,
            'shots_on_target': 10,
            'corners': 10,
            'fouls': 19,
            'yellow_cards': 3,
            'red_cards': 0,
            'expected_goals_home': 1.9,
            'expected_goals_away': 0.8,
            'goals_last_15_min': 1,
            'penalties': 0,
            'league': 'premier_league'
        },
        'champions_league': {
            'home_goals': 2,
            'away_goals': 2,
            'possession_home': 54.0,
            'total_shots': 20,
            'shots_on_target': 8,
            'corners': 8,
            'fouls': 16,
            'yellow_cards': 4,
            'red_cards': 1,
            'expected_goals_home': 1.4,
            'expected_goals_away': 1.3,
            'goals_last_15_min': 2,
            'penalties': 0,
            'league': 'premier_league'
        },
        'copa_america': {
            'home_goals': 4,
            'away_goals': 3,
            'possession_home': 61.0,
            'total_shots': 19,
            'shots_on_target': 9,
            'corners': 7,
            'fouls': 22,
            'yellow_cards': 5,
            'red_cards': 1,
            'expected_goals_home': 2.0,
            'expected_goals_away': 1.2,
            'goals_last_15_min': 3,
            'penalties': 1,
            'league': 'la_liga'
        },
        'libertadores': {
            'home_goals': 5,
            'away_goals': 4,
            'possession_home': 66.0,
            'total_shots': 17,
            'shots_on_target': 11,
            'corners': 6,
            'fouls': 15,
            'yellow_cards': 7,
            'red_cards': 2,
            'expected_goals_home': 2.1,
            'expected_goals_away': 1.1,
            'goals_last_15_min': 4,
            'penalties': 2,
            'league': 'la_liga'
        },
        'mundial': {
            'home_goals': 2,
            'away_goals': 0,
            'possession_home': 55.0,
            'total_shots': 16,
            'shots_on_target': 7,
            'corners': 9,
            'fouls': 17,
            'yellow_cards': 4,
            'red_cards': 0,
            'expected_goals_home': 1.6,
            'expected_goals_away': 0.7,
            'goals_last_15_min': 0,
            'penalties': 0,
            'league': 'premier_league'
        },
        'serie_a': {
            'home_goals': 2,
            'away_goals': 3,
            'possession_home': 53.0,
            'total_shots': 21,
            'shots_on_target': 8,
            'corners': 9,
            'fouls': 20,
            'yellow_cards': 4,
            'red_cards': 0,
            'expected_goals_home': 1.5,
            'expected_goals_away': 1.8,
            'goals_last_15_min': 2,
            'penalties': 0,
            'league': 'premier_league'
        },
        'liga_espanola': {
            'home_goals': 1,
            'away_goals': 1,
            'possession_home': 52.0,
            'total_shots': 24,
            'shots_on_target': 9,
            'corners': 11,
            'fouls': 28,
            'yellow_cards': 3,
            'red_cards': 0,
            'expected_goals_home': 1.7,
            'expected_goals_away': 0.9,
            'goals_last_15_min': 0,
            'penalties': 0,
            'league': 'la_liga'
        },
        'liga_argentina': {
            'home_goals': 3,
            'away_goals': 2,
            'possession_home': 57.0,
            'total_shots': 18,
            'shots_on_target': 8,
            'corners': 8,
            'fouls': 21,
            'yellow_cards': 5,
            'red_cards': 1,
            'expected_goals_home': 1.8,
            'expected_goals_away': 1.0,
            'goals_last_15_min': 2,
            'penalties': 1,
            'league': 'la_liga'
        }
    }

    if lowered.__contains__('champions') or lowered.__contains__('uefa'):
        return profiles['champions_league']
    if lowered.__contains__('copa america') or lowered.__contains__('america'):
        return profiles['copa_america']
    if lowered.__contains__('libertadores') or lowered.__contains__('conmebol'):
        return profiles['libertadores']
    if lowered.__contains__('mundial') or lowered.__contains__('world cup'):
        return profiles['mundial']
    if lowered.__contains__('serie a') or lowered.__contains__('italia'):
        return profiles['serie_a']
    if lowered.__contains__('la liga') or lowered.__contains__('espan'):
        return profiles['liga_espanola']
    if lowered.__contains__('argentina') or lowered.__contains__('superliga'):
        return profiles['liga_argentina']
    return profiles['premier_league']

@app.route('/api/leagues', methods=['GET'])
def get_leagues():
    """Obtener ligas disponibles con estad�sticas"""
    leagues = {
        'premier_league': {
            'name': 'Premier League',
            'country': 'England',
            'stats_available': True
        },
        'la_liga': {
            'name': 'La Liga',
            'country': 'Spain',
            'stats_available': True
        }
    }
    return jsonify(leagues)

@app.route('/api/health', methods=['GET'])
def health_check():
    """Health check con información del sistema"""
    return jsonify({
        'status': 'healthy',
        'version': '2.0.0',
        'algorithms': [
            'Isolation Forest',
            'Local Outlier Factor',
            'Elliptic Envelope',
            'Z-Score Analysis',
            'Poisson Distribution',
            'Bayesian Probability'
        ]
    })

@app.route('/', methods=['GET'])
def index_page():
    """Sirve la página principal en la raíz del proyecto."""
    html_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'index.html')
    if os.path.exists(html_path):
        with open(html_path, 'r', encoding='utf-8') as f:
            return Response(f.read(), mimetype='text/html')
    return Response('<h1>Football Anomaly Detector</h1>', mimetype='text/html')

@app.route('/<path:path>', methods=['GET'])
def catch_all(path):
    """Sirve la página principal para rutas no API."""
    if path.startswith('api/'):
        return jsonify({'error': 'Not found'}), 404
    return index_page()

@app.route('/api/sample-data', methods=['GET'])
def get_sample_data():
    """Obtener datos de ejemplo para testing"""
    samples = {
        'normal_match': {
            'home_goals': 2,
            'away_goals': 1,
            'possession_home': 52.4,
            'total_shots': 24,
            'shots_on_target': 9,
            'corners': 11,
            'fouls': 28,
            'yellow_cards': 3,
            'red_cards': 0,
            'expected_goals_home': 1.7,
            'expected_goals_away': 0.9,
            'goals_last_15_min': 0,
            'penalties': 0,
            'league': 'premier_league'
        },
        'suspicious_match': {
            'home_goals': 5,
            'away_goals': 4,
            'possession_home': 67.3,
            'total_shots': 18,
            'shots_on_target': 12,
            'corners': 6,
            'fouls': 14,
            'yellow_cards': 7,
            'red_cards': 2,
            'expected_goals_home': 1.8,
            'expected_goals_away': 1.1,
            'goals_last_15_min': 4,
            'penalties': 3,
            'league': 'premier_league'
        },
        'very_suspicious_match': {
            'home_goals': 7,
            'away_goals': 5,
            'possession_home': 72.1,
            'total_shots': 15,
            'shots_on_target': 11,
            'corners': 4,
            'fouls': 10,
            'yellow_cards': 8,
            'red_cards': 3,
            'expected_goals_home': 2.1,
            'expected_goals_away': 0.8,
            'goals_last_15_min': 6,
            'penalties': 4,
            'league': 'premier_league'
        }
    }
    return jsonify(samples)

# Para Vercel serverless
def handler(request, context):
    return app(request, context)

if __name__ == '__main__':
    app.run(debug=True, port=5000, host='0.0.0.0')
