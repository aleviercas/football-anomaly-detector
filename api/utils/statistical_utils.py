# -*- coding: utf-8 -*-

import math


class StatisticalUtils:
    """Utilidades estadísticas ligeras para análisis de fútbol."""

    @staticmethod
    def calculate_bayesian_probability(prior_prob, likelihood, evidence):
        posterior = (likelihood * prior_prob) / evidence if evidence > 0 else 0
        return min(posterior, 1.0)

    @staticmethod
    def poisson_goal_probability(expected_goals, actual_goals):
        if expected_goals <= 0:
            return 1.0 if actual_goals == 0 else 0.0
        return math.exp(-expected_goals) * (expected_goals ** actual_goals) / math.factorial(actual_goals)

    @staticmethod
    def calculate_kelly_criterion(prob, odds):
        if odds <= 0:
            return 0
        b = odds - 1
        q = 1 - prob
        kelly = (b * prob - q) / b
        return kelly

    @staticmethod
    def benford_analysis(numbers):
        if not numbers:
            return 0
        first_digits = []
        for n in numbers:
            if n == 0:
                continue
            s = str(abs(int(n)))
            if s:
                first_digits.append(int(s[0]))
        if not first_digits:
            return 0
        total = len(first_digits)
        benford_dist = [math.log10(1 + 1 / d) for d in range(1, 10)]
        observed = [first_digits.count(d) / total for d in range(1, 10)]
        chi_squared = sum(((obs - exp) ** 2) / exp for obs, exp in zip(observed, benford_dist) if exp > 0)
        return chi_squared

    @staticmethod
    def detect_regression_to_mean(values, window=5):
        if len(values) < window * 2:
            return 0
        recent_avg = sum(values[-window:]) / window
        historical_avg = sum(values[:-window]) / (len(values) - window)
        if historical_avg > 0:
            regression = abs(recent_avg - historical_avg) / historical_avg
            return min(regression, 1.0)
        return 0

    @staticmethod
    def calculate_var(value, confidence=0.95):
        z_score = 1.6448536269514722 if confidence >= 0.95 else 1.2815515655446004
        return value * z_score
