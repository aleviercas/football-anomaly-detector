import numpy as np
from scipy import stats
from scipy.stats import norm, poisson, beta
import math

class StatisticalUtils:
    """Utilidades estad­sticas avanzadas para an¡lisis de fºtbol"""
    
    @staticmethod
    def calculate_bayesian_probability(prior_prob, likelihood, evidence):
        """Calcula probabilidad bayesiana de anomal­a"""
        posterior = (likelihood * prior_prob) / evidence if evidence > 0 else 0
        return min(posterior, 1.0)
    
    @staticmethod
    def poisson_goal_probability(expected_goals, actual_goals):
        """Probabilidad de observar ciertos goles dado xG"""
        return poisson.pmf(actual_goals, expected_goals)
    
    @staticmethod
    def calculate_kelly_criterion(prob, odds):
        """Criterio de Kelly para detectar anomal­as en apuestas"""
        if odds <= 0:
            return 0
        b = odds - 1
        q = 1 - prob
        kelly = (b * prob - q) / b
        return kelly
    
    @staticmethod
    def benford_analysis(numbers):
        """An¡lisis de Benford para detectar manipulaci³n de datos"""
        if not numbers:
            return 0
        
        first_digits = [int(str(abs(n)).strip('0.')) for n in numbers if n != 0]
        if not first_digits:
            return 0
        
        benford_dist = [math.log10(1 + 1/d) for d in range(1, 10)]
        observed = np.bincount(first_digits, minlength=10)[1:10] / len(first_digits)
        
        # Chi-cuadrado test
        chi_squared = sum(
            ((obs - exp) ** 2) / exp 
            for obs, exp in zip(observed, benford_dist)
            if exp > 0
        )
        
        return chi_squared
    
    @staticmethod
    def detect_regression_to_mean(values, window=5):
        """Detecta regresi³n a la media en series temporales"""
        if len(values) < window * 2:
            return 0
        
        recent_avg = np.mean(values[-window:])
        historical_avg = np.mean(values[:-window])
        
        if historical_avg > 0:
            regression = abs(recent_avg - historical_avg) / historical_avg
            return min(regression, 1.0)
        return 0
    
    @staticmethod
    def calculate_var(value, confidence=0.95):
        """Value at Risk para m©tricas de fºtbol"""
        z_score = norm.ppf(confidence)
        var = value * z_score
        return var
