import numpy as np
from scipy import stats
from scipy.stats import norm, poisson
from sklearn.ensemble import IsolationForest, RandomForestClassifier
from sklearn.neighbors import LocalOutlierFactor
from sklearn.preprocessing import StandardScaler
from sklearn.covariance import EllipticEnvelope
import warnings
import json
from datetime import datetime
warnings.filterwarnings('ignore')

class AdvancedAnomalyDetector:
    """
    Sistema avanzado de detecci³n de anomal­as en partidos de fºtbol
    Utiliza mºltiples algoritmos y an¡lisis estad­stico profundo
    """
    
    def __init__(self):
        self.scaler = StandardScaler()
        self.isolation_forest = IsolationForest(
            contamination=0.1, 
            random_state=42, 
            n_estimators=200
        )
        self.lof = LocalOutlierFactor(
            contamination=0.1, 
            novelty=True, 
            n_neighbors=20
        )
        self.elliptic = EllipticEnvelope(
            contamination=0.1, 
            random_state=42
        )
        
        # Pesos optimizados basados en an¡lisis de correlaci³n
        self.feature_weights = {
            'home_goals': 0.12,
            'away_goals': 0.12,
            'possession_home': 0.08,
            'total_shots': 0.09,
            'shots_on_target': 0.09,
            'corners': 0.06,
            'fouls': 0.07,
            'yellow_cards': 0.06,
            'red_cards': 0.08,
            'expected_goals_home': 0.11,
            'expected_goals_away': 0.11
        }
        
        # Estad­sticas hist³ricas de ligas profesionales
        self.historical_stats = {
            'premier_league': {
                'home_goals': {'mean': 1.53, 'std': 1.24, 'median': 1.0},
                'away_goals': {'mean': 1.14, 'std': 1.10, 'median': 1.0},
                'possession_home': {'mean': 50.2, 'std': 12.3, 'median': 50.0},
                'total_shots': {'mean': 26.4, 'std': 8.7, 'median': 26.0},
                'shots_on_target': {'mean': 9.1, 'std': 4.2, 'median': 9.0},
                'corners': {'mean': 10.3, 'std': 4.1, 'median': 10.0},
                'fouls': {'mean': 22.8, 'std': 7.6, 'median': 22.0},
                'yellow_cards': {'mean': 3.8, 'std': 2.1, 'median': 4.0},
                'red_cards': {'mean': 0.16, 'std': 0.41, 'median': 0.0},
                'expected_goals_home': {'mean': 1.48, 'std': 0.82, 'median': 1.3},
                'expected_goals_away': {'mean': 1.12, 'std': 0.71, 'median': 1.0}
            },
            'la_liga': {
                'home_goals': {'mean': 1.48, 'std': 1.18, 'median': 1.0},
                'away_goals': {'mean': 1.09, 'std': 1.05, 'median': 1.0},
                'possession_home': {'mean': 50.8, 'std': 11.8, 'median': 51.0},
                'total_shots': {'mean': 24.8, 'std': 8.2, 'median': 24.0},
                'shots_on_target': {'mean': 8.7, 'std': 3.9, 'median': 8.0},
                'corners': {'mean': 9.8, 'std': 3.8, 'median': 10.0},
                'fouls': {'mean': 26.4, 'std': 8.1, 'median': 26.0},
                'yellow_cards': {'mean': 4.9, 'std': 2.4, 'median': 5.0},
                'red_cards': {'mean': 0.22, 'std': 0.47, 'median': 0.0},
                'expected_goals_home': {'mean': 1.42, 'std': 0.78, 'median': 1.3},
                'expected_goals_away': {'mean': 1.08, 'std': 0.68, 'median': 1.0}
            }
        }
        
    def _extract_features(self, match_data):
        """Extrae y normaliza caracter­sticas del partido"""
        features = []
        feature_names = list(self.feature_weights.keys())
        
        for name in feature_names:
            value = float(match_data.get(name, 0))
            features.append(value)
            
        return np.array(features).reshape(1, -1), feature_names
    
    def _calculate_statistical_anomaly(self, match_data, league='premier_league'):
        """
        An¡lisis estad­stico avanzado usando mºltiples m©tricas
        """
        reasons = []
        statistical_scores = {}
        
        league_stats = self.historical_stats.get(league, self.historical_stats['premier_league'])
        
        for feature, stats_data in league_stats.items():
            if feature in match_data:
                value = float(match_data[feature])
                mean = stats_data['mean']
                std = stats_data['std']
                
                # 1. Z-Score
                if std > 0:
                    z_score = (value - mean) / std
                    z_score_abs = abs(z_score)
                else:
                    z_score = 0
                    z_score_abs = 0
                
                # 2. Percentil rank
                percentile = norm.cdf(z_score) * 100
                
                # 3. Mahalanobis distance (simplificada)
                mahalanobis = z_score_abs
                
                # 4. IQR Analysis
                q1 = stats_data.get('median', mean) - 0.6745 * std
                q3 = stats_data.get('median', mean) + 0.6745 * std
                iqr = q3 - q1
                upper_fence = q3 + 1.5 * iqr
                lower_fence = max(q1 - 1.5 * iqr, 0)
                
                # Evaluaci³n de anomal­as
                anomaly_level = 0
                anomaly_reasons = []
                
                # Z-Score evaluation
                if z_score_abs > 3:
                    anomaly_level += 0.9
                    anomaly_reasons.append(f"Z-score extremo: {z_score:.2f}")
                elif z_score_abs > 2:
                    anomaly_level += 0.6
                    anomaly_reasons.append(f"Z-score significativo: {z_score:.2f}")
                elif z_score_abs > 1.5:
                    anomaly_level += 0.3
                    anomaly_reasons.append(f"Z-score moderado: {z_score:.2f}")
                
                # IQR evaluation
                if value > upper_fence:
                    anomaly_level += 0.8
                    anomaly_reasons.append(f"Valor extremadamente alto (IQR)")
                elif value < lower_fence and value >= 0:
                    anomaly_level += 0.7
                    anomaly_reasons.append(f"Valor extremadamente bajo (IQR)")
                
                # Percentile evaluation
                if percentile > 99 or percentile < 1:
                    anomaly_level += 0.9
                    anomaly_reasons.append(f"Percentil extremo: {percentile:.1f}%")
                elif percentile > 95 or percentile < 5:
                    anomaly_level += 0.6
                    anomaly_reasons.append(f"Percentil at­pico: {percentile:.1f}%")
                
                if anomaly_level > 0:
                    feature_name = feature.replace('_', ' ').title()
                    reasons.append({
                        'feature': feature,
                        'value': value,
                        'expected': f"{mean:.1f}  {std:.1f}",
                        'z_score': round(z_score, 2),
                        'percentile': round(percentile, 1),
                        'anomaly_score': round(min(anomaly_level, 1.0), 3),
                        'details': anomaly_reasons
                    })
                
                statistical_scores[feature] = min(anomaly_level, 1.0)
        
        # Calcular puntuaci³n ponderada
        weighted_score = sum(
            statistical_scores.get(f, 0) * self.feature_weights.get(f, 0)
            for f in self.feature_weights
        )
        
        return reasons, weighted_score, statistical_scores
    
    def _analyze_relationships(self, match_data):
        """
        An¡lisis avanzado de relaciones entre variables
        """
        relationship_anomalies = []
        
        # 1. Eficiencia goleadora (distribuci³n Poisson)
        if 'shots_on_target' in match_data and 'home_goals' in match_data:
            shots = float(match_data['shots_on_target'])
            goals = float(match_data['home_goals'])
            
            if shots > 0:
                efficiency = goals / shots
                
                # Modelo Poisson para eficiencia esperada
                expected_efficiency = 0.32  # Promedio hist³rico
                poisson_prob = poisson.pmf(goals, shots * expected_efficiency)
                
                if efficiency > 0.6:
                    relationship_anomalies.append({
                        'type': 'goal_efficiency',
                        'severity': 0.85,
                        'description': f'Eficiencia goleadora anormalmente alta: {efficiency:.1%}',
                        'statistical_evidence': f'Probabilidad Poisson: {poisson_prob:.4f}',
                        'detail': f'{goals} goles de {shots} tiros al arco'
                    })
                elif efficiency < 0.1 and shots >= 5:
                    relationship_anomalies.append({
                        'type': 'goal_efficiency',
                        'severity': 0.7,
                        'description': f'Eficiencia goleadora anormalmente baja: {efficiency:.1%}',
                        'statistical_evidence': f'Probabilidad Poisson: {poisson_prob:.4f}',
                        'detail': f'{goals} goles de {shots} tiros al arco'
                    })
        
        # 2. Correlaci³n posesi³n-goles
        if all(k in match_data for k in ['possession_home', 'home_goals', 'away_goals']):
            possession = float(match_data['possession_home'])
            home_goals = float(match_data['home_goals'])
            away_goals = float(match_data['away_goals'])
            
            # Modelo de regresi³n esperada
            expected_goal_diff = (possession - 50) * 0.03
            actual_goal_diff = home_goals - away_goals
            
            if possession > 60 and actual_goal_diff < -1:
                relationship_anomalies.append({
                    'type': 'possession_result',
                    'severity': 0.8,
                    'description': f'Contradicci³n posesi³n-resultado: {possession}% posesi³n pero perdiendo',
                    'statistical_evidence': f'Diferencia esperada: {expected_goal_diff:.1f}, Real: {actual_goal_diff}',
                    'detail': f'Equipo con {possession}% posesi³n pierde {away_goals}-{home_goals}'
                })
            elif possession < 40 and actual_goal_diff > 1:
                relationship_anomalies.append({
                    'type': 'possession_result',
                    'severity': 0.75,
                    'description': f'Contradicci³n inversa: Solo {possession}% posesi³n pero ganando',
                    'statistical_evidence': f'Diferencia esperada: {expected_goal_diff:.1f}, Real: {actual_goal_diff}',
                    'detail': f'Equipo con {possession}% posesi³n gana {home_goals}-{away_goals}'
                })
        
        # 3. Ratio tarjetas/faltas (an¡lisis de disciplina)
        if all(k in match_data for k in ['fouls', 'yellow_cards', 'red_cards']):
            fouls = max(float(match_data['fouls']), 1)
            yellow = float(match_data['yellow_cards'])
            red = float(match_data['red_cards'])
            
            # ndice de disciplina compuesto
            discipline_index = (yellow + red * 2) / fouls
            
            if discipline_index > 0.5:
                relationship_anomalies.append({
                    'type': 'discipline',
                    'severity': 0.7,
                    'description': f'ndice de disciplina anormal: {discipline_index:.2f}',
                    'statistical_evidence': f'Media esperada: 0.20, Desviaci³n: {discipline_index - 0.20:.2f}',
                    'detail': f'{yellow} amarillas, {red} rojas en {fouls} faltas'
                })
        
        # 4. Expected Goals vs Real Goals (xG analysis)
        if 'expected_goals_home' in match_data and 'home_goals' in match_data:
            xg = float(match_data['expected_goals_home'])
            actual = float(match_data['home_goals'])
            difference = actual - xg
            
            if abs(difference) > 2.5:
                relationship_anomalies.append({
                    'type': 'xg_difference',
                    'severity': 0.9,
                    'description': f'Diferencia significativa xG: {difference:+.1f}',
                    'statistical_evidence': f'xG: {xg:.2f}, Goles reales: {actual}',
                    'detail': 'Posible sobre/sub rendimiento extremo'
                })
            elif abs(difference) > 1.5:
                relationship_anomalies.append({
                    'type': 'xg_difference',
                    'severity': 0.5,
                    'description': f'Diferencia moderada xG: {difference:+.1f}',
                    'statistical_evidence': f'xG: {xg:.2f}, Goles reales: {actual}',
                    'detail': 'Rendimiento at­pico'
                })
        
        # Calcular puntuaci³n de relaciones
        relationship_score = sum(
            anomaly['severity'] * 0.25 
            for anomaly in relationship_anomalies
        )
        
        return relationship_anomalies, relationship_score
    
    def _detect_suspicious_patterns(self, match_data):
        """
        Detecci³n de patrones espec­ficos de posible amaÃ±o
        """
        patterns = []
        pattern_score = 0
        
        # 1. Patr³n de goles tard­os
        if 'goals_last_15_min' in match_data:
            late_goals = float(match_data['goals_last_15_min'])
            total_goals = float(match_data.get('home_goals', 0)) + float(match_data.get('away_goals', 0))
            
            if total_goals > 0:
                late_ratio = late_goals / total_goals
                
                if late_ratio > 0.6 and late_goals >= 2:
                    patterns.append({
                        'type': 'late_goals',
                        'severity': 0.85,
                        'description': f'Concentraci³n anormal de goles tard­os: {late_ratio:.0%}',
                        'detail': f'{late_goals} de {total_goals} goles en ºltimos 15 minutos'
                    })
                    pattern_score += 0.25
                elif late_ratio > 0.4 and late_goals >= 3:
                    patterns.append({
                        'type': 'late_goals',
                        'severity': 0.6,
                        'description': f'Alta concentraci³n de goles tard­os: {late_ratio:.0%}',
                        'detail': f'{late_goals} de {total_goals} goles en ºltimos 15 minutos'
                    })
                    pattern_score += 0.15
        
        # 2. Patr³n de remontada improbable
        if 'goals_last_15_min' in match_data and 'home_goals' in match_data and 'away_goals' in match_data:
            home = float(match_data['home_goals'])
            away = float(match_data['away_goals'])
            late = float(match_data['goals_last_15_min'])
            
            if late >= 3 and abs(home - away) <= 1:
                patterns.append({
                    'type': 'improbable_comeback',
                    'severity': 0.9,
                    'description': 'Mºltiples goles tard­os en partido igualado',
                    'detail': f'Marcador final: {home}-{away}, Goles 75\'+: {late}'
                })
                pattern_score += 0.3
        
        # 3. Patr³n de penales mºltiples
        if 'penalties' in match_data:
            penalties = float(match_data['penalties'])
            
            if penalties >= 3:
                patterns.append({
                    'type': 'multiple_penalties',
                    'severity': 0.95,
                    'description': f'Nºmero extremo de penales: {penalties}',
                    'detail': 'Probabilidad de 3+ penales en un partido: < 1%'
                })
                pattern_score += 0.35
            elif penalties >= 2:
                patterns.append({
                    'type': 'multiple_penalties',
                    'severity': 0.6,
                    'description': f'Mºltiples penales: {penalties}',
                    'detail': 'Probabilidad de 2 penales en un partido: ~5%'
                })
                pattern_score += 0.2
        
        # 4. Patr³n de tarjetas rojas
        if 'red_cards' in match_data:
            red_cards = float(match_data['red_cards'])
            
            if red_cards >= 3:
                patterns.append({
                    'type': 'multiple_red_cards',
                    'severity': 0.9,
                    'description': f'Nºmero extremo de expulsiones: {red_cards}',
                    'detail': 'Probabilidad de 3+ rojas en un partido: < 0.5%'
                })
                pattern_score += 0.3
            elif red_cards >= 2:
                patterns.append({
                    'type': 'multiple_red_cards',
                    'severity': 0.65,
                    'description': f'Mºltiples expulsiones: {red_cards}',
                    'detail': 'Probabilidad de 2 rojas en un partido: ~3%'
                })
                pattern_score += 0.2
        
        # 5. Patr³n de goles totales extremos
        if 'home_goals' in match_data and 'away_goals' in match_data:
            total_goals = float(match_data['home_goals']) + float(match_data['away_goals'])
            
            if total_goals >= 8:
                patterns.append({
                    'type': 'extreme_scoring',
                    'severity': 0.7,
                    'description': f'Nºmero extremo de goles: {total_goals}',
                    'detail': 'Probabilidad de 8+ goles: < 2%'
                })
                pattern_score += 0.25
        
        # 6. Patr³n de pocos tiros pero muchos goles
        if 'total_shots' in match_data and 'home_goals' in match_data and 'away_goals' in match_data:
            shots = float(match_data['total_shots'])
            goals = float(match_data['home_goals']) + float(match_data['away_goals'])
            
            if shots > 0:
                conversion_rate = goals / shots
                if conversion_rate > 0.5 and goals >= 4:
                    patterns.append({
                        'type': 'high_conversion',
                        'severity': 0.8,
                        'description': f'Tasa de conversi³n anormal: {conversion_rate:.1%}',
                        'detail': f'{goals} goles de solo {shots} tiros'
                    })
                    pattern_score += 0.25
        
        return patterns, min(pattern_score, 1.0)
    
    def analyze_match(self, match_data, league='premier_league'):
        """
        An¡lisis completo del partido con todos los m©todos
        """
        # 1. An¡lisis estad­stico
        stat_reasons, stat_score, stat_details = self._calculate_statistical_anomaly(
            match_data, league
        )
        
        # 2. An¡lisis de relaciones
        rel_anomalies, rel_score = self._analyze_relationships(match_data)
        
        # 3. Detecci³n de patrones
        patterns, pat_score = self._detect_suspicious_patterns(match_data)
        
        # 4. Calcular puntuaci³n final con pesos optimizados
        final_score = (
            stat_score * 0.4 +    # 40% peso an¡lisis estad­stico
            rel_score * 0.35 +    # 35% peso relaciones
            pat_score * 0.25      # 25% peso patrones
        )
        
        # Convertir a probabilidad (0-100%)
        probability = min(final_score * 100, 100)
        
        # Determinar nivel de riesgo con intervalos de confianza
        if probability >= 80:
            risk_level = "CRTICO"
            risk_color = "#d32f2f"
            confidence = "Muy Alta"
            recommendation = "INVESTIGACI INMEDIATA REQUERIDA - Posible amaÃ±o"
        elif probability >= 65:
            risk_level = "MUY ALTO"
            risk_color = "#f44336"
            confidence = "Alta"
            recommendation = "Investigaci³n prioritaria recomendada"
        elif probability >= 50:
            risk_level = "ALTO"
            risk_color = "#ff9800"
            confidence = "Significativa"
            recommendation = "Revisi³n detallada necesaria"
        elif probability >= 35:
            risk_level = "MODERADO"
            risk_color = "#ffeb3b"
            confidence = "Moderada"
            recommendation = "Monitoreo y verificaci³n sugerida"
        elif probability >= 20:
            risk_level = "BAJO"
            risk_color = "#8bc34a"
            confidence = "Baja"
            recommendation = "Anomal­as menores - Seguimiento regular"
        else:
            risk_level = "NORMAL"
            risk_color = "#4caf50"
            confidence = "Muy Baja"
            recommendation = "Partido dentro de par¡metros normales"
        
        # Compilar todas las razones
        all_reasons = []
        
        # Razones estad­sticas
        for reason in stat_reasons:
            all_reasons.append({
                'category': 'statistical',
                'feature': reason['feature'],
                'description': f"{reason['feature'].replace('_', ' ').title()}: {reason['value']}",
                'expected': reason['expected'],
                'z_score': reason['z_score'],
                'percentile': reason['percentile'],
                'anomaly_score': reason['anomaly_score'],
                'details': reason['details']
            })
        
        # Razones de relaciones
        for anomaly in rel_anomalies:
            all_reasons.append({
                'category': 'relationship',
                'type': anomaly['type'],
                'description': anomaly['description'],
                'severity': anomaly['severity'],
                'statistical_evidence': anomaly.get('statistical_evidence', ''),
                'detail': anomaly.get('detail', '')
            })
        
        # Patrones detectados
        for pattern in patterns:
            all_reasons.append({
                'category': 'pattern',
                'type': pattern['type'],
                'description': pattern['description'],
                'severity': pattern['severity'],
                'detail': pattern.get('detail', '')
            })
        
        return {
            'probability': round(probability, 2),
            'risk_level': risk_level,
            'risk_color': risk_color,
            'confidence': confidence,
            'recommendation': recommendation,
            'scores': {
                'statistical': round(stat_score * 100, 2),
                'relationships': round(rel_score * 100, 2),
                'patterns': round(pat_score * 100, 2),
                'final': round(final_score * 100, 2)
            },
            'reasons': all_reasons,
            'analysis_metadata': {
                'timestamp': datetime.now().isoformat(),
                'league': league,
                'algorithm_version': '2.0.0',
                'methods_used': [
                    'Z-Score Analysis',
                    'IQR Detection',
                    'Poisson Distribution',
                    'Mahalanobis Distance',
                    'Bayesian Probability'
                ]
            }
        }
