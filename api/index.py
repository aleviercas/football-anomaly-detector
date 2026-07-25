# -*- coding: utf-8 -*-

from flask import Flask, request, jsonify
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
    """
    Endpoint principal de an�lisis de anomal�as
    """
    try:
        data = request.json
        
        if not data:
            return jsonify({
                'success': False,
                'error': 'No data provided'
            }), 400
        
        # Validar campos requeridos
        required_fields = ['home_goals', 'away_goals']
        missing_fields = [f for f in required_fields if f not in data]
        
        if missing_fields:
            return jsonify({
                'success': False,
                'error': f'Missing required fields: {", ".join(missing_fields)}'
            }), 400
        
        # Obtener liga (opcional)
        league = data.get('league', 'premier_league')
        
        # Realizar an�lisis completo
        result = detector.analyze_match(data, league)
        
        # Añadir an�lisis adicionales
        if 'total_shots' in data and 'shots_on_target' in data:
            result['additional_metrics'] = {
                'shot_accuracy': round(
                    float(data['shots_on_target']) / max(float(data['total_shots']), 1) * 100, 1
                )
            }
        
        # An�lisis de Benford para datos num�ricos
        numeric_values = [
            float(v) for k, v in data.items() 
            if isinstance(v, (int, float)) and v != 0
        ]
        if numeric_values:
            benford_score = stats_utils.benford_analysis(numeric_values)
            if benford_score > 15:  # Chi-cuadrado cr�tico
                result['data_integrity'] = {
                    'benford_score': round(benford_score, 2),
                    'warning': 'Posible manipulaci�n de datos detectada por Ley de Benford'
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
    """Health check con informaci�n del sistema"""
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
