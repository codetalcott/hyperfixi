#!/usr/bin/env node

/**
 * HyperFixi Metrics Dashboard
 * Visual tracking of compatibility progress and improvement trends
 */

import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

class MetricsDashboard {
  constructor() {
    this.metricsDir = join(process.cwd(), 'metrics');
    this.compatibilityFile = join(this.metricsDir, 'compatibility-history.json');
    this.improvementFile = join(this.metricsDir, 'improvement-log.json');
  }

  loadMetrics() {
    const metrics = {
      compatibility: [],
      improvements: []
    };

    if (existsSync(this.compatibilityFile)) {
      try {
        metrics.compatibility = JSON.parse(readFileSync(this.compatibilityFile, 'utf8'));
      } catch (error) {
        console.warn('Could not load compatibility metrics');
      }
    }

    if (existsSync(this.improvementFile)) {
      try {
        metrics.improvements = JSON.parse(readFileSync(this.improvementFile, 'utf8'));
      } catch (error) {
        console.warn('Could not load improvement metrics');
      }
    }

    return metrics;
  }

  generateDashboard() {
    const metrics = this.loadMetrics();
    
    console.log('╔═══════════════════════════════════════════════════════════╗');
    console.log('║                  🎯 HyperFixi Metrics Dashboard           ║');
    console.log('╠═══════════════════════════════════════════════════════════╣');
    
    this.displayCurrentStatus(metrics);
    this.displayTrends(metrics);
    this.displayImprovementHistory(metrics);
    this.displayRecommendations(metrics);
    
    console.log('╚═══════════════════════════════════════════════════════════╝');
  }

  displayCurrentStatus(metrics) {
    console.log('║ 📊 CURRENT STATUS                                        ║');
    console.log('╠═══════════════════════════════════════════════════════════╣');
    
    const latest = metrics.compatibility.slice(-1)[0];
    
    if (latest) {
      const expressionScore = latest.expressionTests?.compatibility || 0;
      const commandScore = latest.commandTests?.compatibility || 0;
      const overallScore = (expressionScore + commandScore) / 2;
      
      console.log(`║ Expression Compatibility: ${this.formatScore(expressionScore)}                    ║`);
      console.log(`║ Command Compatibility:    ${this.formatScore(commandScore)}                    ║`);
      console.log(`║ Overall Compatibility:    ${this.formatScore(overallScore)}                    ║`);
      console.log(`║ Core Test Pass Rate:      ${this.formatScore(latest.coreTests?.passRate || 100)}                    ║`);
      console.log(`║ Last Updated: ${new Date(latest.timestamp).toLocaleDateString()}                              ║`);
    } else {
      console.log('║ No compatibility data available - run npm run compatibility:monitor ║');
    }
    
    console.log('╠═══════════════════════════════════════════════════════════╣');
  }

  displayTrends(metrics) {
    console.log('║ 📈 TRENDS (Last 7 Days)                                  ║');
    console.log('╠═══════════════════════════════════════════════════════════╣');
    
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const recentMetrics = metrics.compatibility.filter(
      m => new Date(m.timestamp) > sevenDaysAgo
    );
    
    if (recentMetrics.length >= 2) {
      const first = recentMetrics[0];
      const last = recentMetrics[recentMetrics.length - 1];
      
      const expressionTrend = this.calculateTrend(
        first.expressionTests?.compatibility,
        last.expressionTests?.compatibility
      );
      
      const commandTrend = this.calculateTrend(
        first.commandTests?.compatibility,
        last.commandTests?.compatibility
      );
      
      console.log(`║ Expression Tests: ${this.formatTrend(expressionTrend)}                             ║`);
      console.log(`║ Command Tests:    ${this.formatTrend(commandTrend)}                             ║`);
      console.log(`║ Data Points:      ${recentMetrics.length} measurements                       ║`);
    } else {
      console.log('║ Insufficient data for trend analysis (need 7+ days)      ║');
    }
    
    console.log('╠═══════════════════════════════════════════════════════════╣');
  }

  displayImprovementHistory(metrics) {
    console.log('║ 🔄 IMPROVEMENT CYCLES (Last 5)                           ║');
    console.log('╠═══════════════════════════════════════════════════════════╣');
    
    const recentCycles = metrics.improvements.slice(-5);
    
    if (recentCycles.length > 0) {
      recentCycles.forEach((cycle, index) => {
        const date = new Date(cycle.startTime).toLocaleDateString();
        const status = cycle.success ? '✅' : '❌';
        const duration = this.calculateDuration(cycle.startTime, cycle.endTime);
        
        console.log(`║ ${index + 1}. ${date} ${status} (${duration})                               ║`);
      });
      
      const successRate = (recentCycles.filter(c => c.success).length / recentCycles.length) * 100;
      console.log(`║ Success Rate: ${successRate.toFixed(0)}%                                    ║`);
    } else {
      console.log('║ No improvement cycles recorded yet                        ║');
    }
    
    console.log('╠═══════════════════════════════════════════════════════════╣');
  }

  displayRecommendations(metrics) {
    console.log('║ 💡 RECOMMENDATIONS                                       ║');
    console.log('╠═══════════════════════════════════════════════════════════╣');
    
    const latest = metrics.compatibility.slice(-1)[0];
    const recommendations = [];
    
    if (latest) {
      const expressionScore = latest.expressionTests?.compatibility || 0;
      const commandScore = latest.commandTests?.compatibility || 0;
      
      if (expressionScore < 90) {
        recommendations.push('Focus on expression compatibility improvements');
      }
      
      if (commandScore < 80) {
        recommendations.push('Target command implementation gaps');
      }
      
      if (expressionScore >= 90 && commandScore >= 80) {
        recommendations.push('Excellent progress! Focus on edge cases');
      }
    }
    
    // Check improvement cycle frequency
    const recentCycles = metrics.improvements.filter(
      c => new Date(c.startTime) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    );
    
    if (recentCycles.length === 0) {
      recommendations.push('Run improvement cycle: npm run compatibility:cycle');
    }
    
    if (recommendations.length === 0) {
      recommendations.push('Monitor metrics regularly for sustained progress');
    }
    
    recommendations.forEach((rec, index) => {
      console.log(`║ ${index + 1}. ${rec.padEnd(53)} ║`);
    });
    
    console.log('╠═══════════════════════════════════════════════════════════╣');
    console.log('║ 🚀 QUICK COMMANDS                                        ║');
    console.log('║ • npm run compatibility:monitor - Check current status   ║');
    console.log('║ • npm run compatibility:improve - Run improvement cycle  ║');
    console.log('║ • npm run compatibility:cycle   - Full monitor + improve ║');
  }

  formatScore(score) {
    if (typeof score !== 'number') return 'N/A'.padEnd(6);
    
    const formatted = `${score.toFixed(1)}%`;
    const emoji = score >= 95 ? '🟢' : score >= 85 ? '🟡' : '🔴';
    return `${emoji} ${formatted}`.padEnd(10);
  }

  formatTrend(trend) {
    if (trend === null) return 'No data';
    
    const arrow = trend > 0 ? '📈' : trend < 0 ? '📉' : '➡️';
    const change = Math.abs(trend).toFixed(1);
    return `${arrow} ${trend > 0 ? '+' : trend < 0 ? '-' : ''}${change}%`;
  }

  calculateTrend(before, after) {
    if (typeof before !== 'number' || typeof after !== 'number') return null;
    return after - before;
  }

  calculateDuration(start, end) {
    if (!start || !end) return 'N/A';
    
    const ms = new Date(end) - new Date(start);
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    
    if (minutes > 0) {
      return `${minutes}m`;
    } else {
      return `${seconds}s`;
    }
  }
}

// Main execution
async function main() {
  const dashboard = new MetricsDashboard();
  dashboard.generateDashboard();
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}