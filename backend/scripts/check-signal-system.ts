// Diagnostic script to check signal detection system health
// Run with: npx tsx backend/scripts/check-signal-system.ts

import pool from '../src/db/client';
import axios from 'axios';

async function checkSystem() {
  console.log('🔍 Checking Signal Detection System Health...\n');

  try {
    // 1. Check database connection
    console.log('1️⃣ Checking database connection...');
    const dbTest = await pool.query('SELECT NOW()');
    console.log('   ✅ Database connected:', dbTest.rows[0].now);

    // 2. Check if table exists
    console.log('\n2️⃣ Checking confluence_alerts table...');
    const tableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_name = 'confluence_alerts'
      );
    `);
    if (tableCheck.rows[0].exists) {
      console.log('   ✅ Table exists');
    } else {
      console.log('   ❌ Table does not exist! Run database migration.');
      process.exit(1);
    }

    // 3. Count total signals
    console.log('\n3️⃣ Counting stored signals...');
    const countResult = await pool.query('SELECT COUNT(*) as count FROM confluence_alerts');
    const totalSignals = parseInt(countResult.rows[0].count);
    console.log(`   📊 Total signals in database: ${totalSignals}`);

    if (totalSignals === 0) {
      console.log('   ⚠️  No signals yet. Possible reasons:');
      console.log('      - System is in learning phase (needs 7 days)');
      console.log('      - Market conditions are calm');
      console.log('      - Backend signal detector not running');
    }

    // 4. Check recent signals (last 24 hours)
    console.log('\n4️⃣ Checking recent signals (last 24 hours)...');
    const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000);
    const recentResult = await pool.query(
      'SELECT COUNT(*) as count FROM confluence_alerts WHERE timestamp > $1',
      [oneDayAgo]
    );
    const recentSignals = parseInt(recentResult.rows[0].count);
    console.log(`   📊 Signals in last 24h: ${recentSignals}`);

    if (recentSignals === 0 && totalSignals > 0) {
      console.log('   ⚠️  No recent signals (market may be calm)');
    } else if (recentSignals > 20) {
      console.log('   ⚠️  Too many signals! V2 system should generate 3-7 per week.');
      console.log('      Check if thresholds are too low.');
    }

    // 5. Check signal distribution by severity
    console.log('\n5️⃣ Signal distribution by severity...');
    const severityResult = await pool.query(`
      SELECT severity, COUNT(*) as count
      FROM confluence_alerts
      GROUP BY severity
      ORDER BY count DESC
    `);

    if (severityResult.rows.length > 0) {
      severityResult.rows.forEach(row => {
        console.log(`   ${row.severity.padEnd(10)}: ${row.count}`);
      });
    } else {
      console.log('   No signals to analyze');
    }

    // 6. Check top symbols
    console.log('\n6️⃣ Top symbols by signal count...');
    const symbolResult = await pool.query(`
      SELECT symbol, COUNT(*) as count
      FROM confluence_alerts
      GROUP BY symbol
      ORDER BY count DESC
      LIMIT 5
    `);

    if (symbolResult.rows.length > 0) {
      symbolResult.rows.forEach(row => {
        console.log(`   ${row.symbol.padEnd(12)}: ${row.count} signals`);
      });
    } else {
      console.log('   No signals to analyze');
    }

    // 7. Check Binance API connectivity
    console.log('\n7️⃣ Checking Binance API connectivity...');
    try {
      const binanceTest = await axios.get('https://fapi.binance.com/fapi/v1/ticker/24hr?symbol=BTCUSDT', {
        timeout: 5000
      });
      console.log(`   ✅ Binance API accessible (BTC price: $${parseFloat(binanceTest.data.lastPrice).toFixed(2)})`);
    } catch (error) {
      console.log('   ❌ Cannot reach Binance API');
      console.log('      Error:', (error as Error).message);
      console.log('      Tip: Backend may be blocked. WebSocket fallback should handle this.');
    }

    // 8. System recommendations
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📋 System Recommendations:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    if (totalSignals === 0) {
      console.log('🔸 System Status: LEARNING PHASE');
      console.log('   Wait 7 days for V2 percentile-based detection to mature.');
      console.log('   Expected: 0-3 signals in first week.');
    } else if (totalSignals < 20) {
      console.log('🔸 System Status: COLLECTING DATA');
      console.log(`   Current: ${totalSignals} signals stored`);
      console.log('   Target: 20+ signals for reliable percentile calculations');
    } else if (recentSignals === 0) {
      console.log('🔸 System Status: OPERATIONAL (Calm Market)');
      console.log('   No signals in 24h is NORMAL during calm market conditions.');
      console.log('   V2 system only alerts on extreme patterns.');
    } else if (recentSignals >= 1 && recentSignals <= 7) {
      console.log('✅ System Status: HEALTHY');
      console.log(`   ${recentSignals} signals in 24h (target: 0-7/day)`);
      console.log('   System is operating within expected parameters.');
    } else {
      console.log('⚠️  System Status: TOO MANY SIGNALS');
      console.log(`   ${recentSignals} signals in 24h (expected: 0-7/day)`);
      console.log('   Consider increasing SCORE_THRESHOLD in confluenceDetectorV2.ts');
    }

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  } catch (error) {
    console.error('\n❌ Error during health check:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run check
checkSystem();
