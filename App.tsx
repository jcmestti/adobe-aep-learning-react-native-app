import React, {useCallback, useState} from 'react';
import {SafeAreaView, ScrollView, StatusBar, StyleSheet, Text, TextInput, TouchableOpacity, View} from 'react-native';
import {MobileCore, LogLevel} from '@adobe/react-native-aepcore';
import {Edge, ExperienceEvent} from '@adobe/react-native-aepedge';
import {Identity} from '@adobe/react-native-aepedgeidentity';
import {Consent} from '@adobe/react-native-aepedgeconsent';
import {Assurance} from '@adobe/react-native-aepassurance';

type LogItem = {id: number; time: string; title: string; code: string; tone: 'good' | 'warn' | 'info'};
const APP_ID_PLACEHOLDER = 'YOUR_ADOBE_LAUNCH_ENVIRONMENT_APP_ID';
const CONFIGURED_APP_ID = __AEP_APP_ID__;

export default function App() {
  const [appId, setAppId] = useState(CONFIGURED_APP_ID || APP_ID_PLACEHOLDER);
  const [assuranceUrl, setAssuranceUrl] = useState('');
  const [ecid, setEcid] = useState('');
  const [ecidLoading, setEcidLoading] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const [consent, setConsent] = useState<'y' | 'n' | 'unknown'>('unknown');
  const [busy, setBusy] = useState(false);
  const [logs, setLogs] = useState<LogItem[]>([]);

  const addLog = useCallback((title: string, code: string, tone: LogItem['tone'] = 'info') => {
    const time = new Date().toLocaleTimeString([], {hour: '2-digit', minute: '2-digit', second: '2-digit'});
    setLogs(current => [{id: Date.now() + Math.random(), time, title, code, tone}, ...current].slice(0, 30));
  }, []);

  const initialize = async () => {
    if (!appId.trim() || appId === APP_ID_PLACEHOLDER) {
      addLog('Configuration needed', 'Enter your Adobe Data Collection mobile property environment ID before initializing.', 'warn');
      return;
    }
    setBusy(true);
    addLog('Initializing Adobe Experience Platform', 'MobileCore.setLogLevel(LogLevel.DEBUG);\nMobileCore.initializeWithAppId(appId);');
    try {
      MobileCore.setLogLevel(LogLevel.DEBUG);
      await MobileCore.initializeWithAppId(appId.trim());
      setInitialized(true);
      addLog('SDK initialized', 'Core initialized; bundled Edge, Edge Identity, Edge Consent, and Assurance extensions are available.', 'good');
      setEcidLoading(true);
      try {
        const experienceCloudId = await Identity.getExperienceCloudId();
        setEcid(experienceCloudId);
        addLog('ECID retrieved', experienceCloudId, 'good');
      } catch (error) {
        addLog('ECID retrieval failed', String(error), 'warn');
      } finally {
        setEcidLoading(false);
      }
    } catch (error) {
      addLog('Initialization failed', String(error), 'warn');
    } finally { setBusy(false); }
  };

  const updateConsent = async (value: 'y' | 'n') => {
    if (!initialized) { addLog('Initialize first', 'Initialize the SDK before changing consent.', 'warn'); return; }
    const snippet = "Consent.update({consents: {collect: {val: '" + value + "'}}});";
    addLog(value === 'y' ? 'Consent set to Yes' : 'Consent set to No', snippet);
    try {
      await Consent.update({consents: {collect: {val: value}}});
      setConsent(value);
      addLog('Consent updated', "collect.val = '" + value + "'", 'good');
    } catch (error) { addLog('Consent update failed', String(error), 'warn'); }
  };

  const sendPageView = async () => {
    if (!initialized) { addLog('Initialize first', 'Initialize the SDK before sending an event.', 'warn'); return; }
    const xdm = {eventType: 'web.webpagedetails.pageViews', web: {webPageDetails: {name: 'AEP Learning App', URL: 'app://learning'}}};
    const experienceEvent = new ExperienceEvent({xdmData: xdm});
    addLog('Sending standard page view', 'const experienceEvent = new ExperienceEvent({xdmData: ' + JSON.stringify(xdm, null, 2) + '});\nEdge.sendEvent(experienceEvent);');
    try {
      await Edge.sendEvent(experienceEvent);
      addLog('Event sent to Edge', 'web.webpagedetails.pageViews', 'good');
    } catch (error) { addLog('Event send failed', String(error), 'warn'); }
  };

  const startAssurance = async () => {
    if (!initialized) { addLog('Initialize first', 'Initialize the SDK before connecting Assurance.', 'warn'); return; }
    const value = assuranceUrl.trim();
    if (!value || !/^[a-z][a-z0-9+.-]*:\/\//i.test(value) || !value.includes('adb_validation_sessionid')) {
      addLog('Check Assurance URL', 'Paste the full session URL, e.g. adobeaeplearning://?adb_validation_sessionid=SESSION_UUID', 'warn');
      return;
    }
    addLog('Starting Assurance session', "Assurance.startSession('" + value + "');");
    try {
      await Assurance.startSession(value);
      addLog('Assurance requested', 'If the app scheme is configured in the native project, the session should connect.', 'good');
    } catch (error) { addLog('Assurance start failed', String(error), 'warn'); }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor="#10131d" />
      <ScrollView contentContainerStyle={styles.page} keyboardShouldPersistTaps="handled">
        <View style={styles.topline}>
          <View style={styles.brandMark}><Text style={styles.brandA}>A</Text></View>
          <Text style={styles.eyebrow}>MOBILE SDK PLAYGROUND</Text>
          <View style={styles.statusPill}><View style={[styles.dot, initialized && styles.dotOn]} /><Text style={styles.statusText}>{initialized ? 'READY' : 'NOT CONNECTED'}</Text></View>
        </View>
        <Text style={styles.title}>Adobe AEP{"\n"}Learning Lab</Text>
        <Text style={styles.subtitle}>A hands-on space for mobile data collection. Configure the SDK, manage consent, and inspect events as they happen.</Text>
        <View style={styles.card}>
          <Text style={styles.ecidLabel}>EXPERIENCE CLOUD ID (ECID)</Text>
          <Text selectable style={styles.ecidValue}>
            {ecidLoading ? 'Retrieving ECID…' : ecid || (initialized ? 'ECID unavailable' : 'Initialize the SDK to retrieve the ECID')}
          </Text>
        </View>

        <View style={styles.card}>
          <Section number="01" title="SDK setup" hint="Initialize extensions bundled with this app" />
          <Text style={styles.label}>DATA COLLECTION APP ID</Text>
          <TextInput value={appId} onChangeText={setAppId} autoCapitalize="none" autoCorrect={false} placeholder="Paste your mobile property ID" placeholderTextColor="#747b89" style={styles.input} />
          <ActionButton title={busy ? 'INITIALIZING…' : initialized ? 'SDK INITIALIZED ✓' : 'INITIALIZE AEP SDK'} onPress={initialize} disabled={busy || initialized} primary />
          <View style={styles.packageRow}><Text style={styles.packageLabel}>PACKAGES</Text><Text style={styles.packageNames}>Core · Edge · Identity · Consent · Assurance</Text></View>
        </View>

        <View style={styles.card}>
          <Section number="02" title="Consent" hint="Set the collect preference sent to Edge" />
          <View style={styles.consentRow}>
            <ActionButton title="ALLOW · YES" onPress={() => updateConsent('y')} disabled={!initialized} primary={consent === 'y'} />
            <ActionButton title="DENY · NO" onPress={() => updateConsent('n')} disabled={!initialized} danger={consent === 'n'} />
          </View>
          <Text style={styles.currentConsent}>CURRENT VALUE <Text style={styles.consentValue}>{consent === 'unknown' ? 'NOT SET' : consent.toUpperCase()}</Text></Text>
        </View>

        <View style={styles.card}>
          <Section number="03" title="Page view event" hint="Send a standard XDM page view to Edge" />
          <View style={styles.eventPreview}><Text style={styles.eventType}>web.webpagedetails.pageViews</Text><Text style={styles.previewCaption}>XDM event type</Text></View>
          <ActionButton title="SEND PAGE VIEW" onPress={sendPageView} disabled={!initialized} />
        </View>

        <View style={styles.card}>
          <Section number="04" title="Assurance session" hint="Connect this app to a live debugging session" />
          <TextInput value={assuranceUrl} onChangeText={setAssuranceUrl} autoCapitalize="none" autoCorrect={false} keyboardType="url" placeholder="adobeaeplearning://?adb_validation_sessionid=…" placeholderTextColor="#747b89" style={styles.input} />
          <ActionButton title="START ASSURANCE" onPress={startAssurance} disabled={!initialized} />
          <Text style={styles.footnote}>Register your URL scheme in the native iOS and Android app configuration too.</Text>
        </View>

        <View style={styles.logPanel}>
          <View style={styles.logHeader}><View><Text style={styles.logEyebrow}>LIVE ACTIVITY</Text><Text style={styles.logTitle}>SDK change log</Text></View><View style={styles.logCount}><Text style={styles.logCountText}>{String(logs.length).padStart(2, '0')}</Text></View></View>
          <Text style={styles.logDescription}>SDK calls and configuration actions appear here with the code they triggered.</Text>
          {logs.length === 0 ? <View style={styles.emptyLog}><Text style={styles.emptyGlyph}>⌁</Text><Text style={styles.emptyText}>No activity yet. Run an action above to see its SDK call.</Text></View> : logs.map(item => (
            <View key={item.id} style={styles.logEntry}>
              <View style={styles.logMeta}><View style={[styles.logDot, item.tone === 'good' && styles.logDotGood, item.tone === 'warn' && styles.logDotWarn]} /><Text style={styles.logEntryTitle}>{item.title}</Text><Text style={styles.logTime}>{item.time}</Text></View>
              <Text selectable style={styles.code}>{item.code}</Text>
            </View>
          ))}
        </View>
        <Text style={styles.footer}>BUILT FOR LEARNING · ADOBE EXPERIENCE PLATFORM</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function Section({number, title, hint}: {number: string; title: string; hint: string}) {
  return <View style={styles.sectionHead}><Text style={styles.number}>{number}</Text><View><Text style={styles.sectionTitle}>{title}</Text><Text style={styles.sectionHint}>{hint}</Text></View></View>;
}
function ActionButton({title, onPress, disabled, primary, danger}: {title: string; onPress: () => void; disabled?: boolean; primary?: boolean; danger?: boolean}) {
  return <TouchableOpacity activeOpacity={0.8} onPress={onPress} disabled={disabled} style={[styles.button, primary && styles.buttonPrimary, danger && styles.buttonDanger, disabled && styles.buttonDisabled]}><Text style={[styles.buttonText, primary && styles.buttonTextPrimary]}>{title}</Text><Text style={[styles.buttonArrow, primary && styles.buttonTextPrimary]}>↗</Text></TouchableOpacity>;
}

const styles = StyleSheet.create({
  safe: {flex: 1, backgroundColor: '#10131d'}, page: {paddingHorizontal: 22, paddingTop: 18, paddingBottom: 42},
  topline: {flexDirection: 'row', alignItems: 'center', marginBottom: 26}, brandMark: {width: 30, height: 30, borderRadius: 9, backgroundColor: '#eb6d44', alignItems: 'center', justifyContent: 'center', marginRight: 10}, brandA: {color: '#10131d', fontSize: 19, fontWeight: '900'}, eyebrow: {color: '#a8afbd', fontSize: 9, letterSpacing: 1.5, fontWeight: '800', flex: 1}, statusPill: {borderWidth: 1, borderColor: '#353a48', borderRadius: 20, paddingHorizontal: 9, paddingVertical: 6, flexDirection: 'row', alignItems: 'center'}, dot: {width: 6, height: 6, borderRadius: 4, backgroundColor: '#687080', marginRight: 6}, dotOn: {backgroundColor: '#79d2a2'}, statusText: {fontSize: 8, color: '#d3d7df', letterSpacing: 0.7, fontWeight: '700'},
  ecidLabel: {fontSize: 8, fontWeight: '800', color: '#ed805c', letterSpacing: 1.2, marginBottom: 7}, ecidValue: {fontSize: 12, color: '#e6e9ef', fontFamily: 'monospace'},
  title: {color: '#f5f2eb', fontSize: 38, lineHeight: 42, fontWeight: '800', letterSpacing: -1.5}, subtitle: {color: '#9aa2b1', fontSize: 13, lineHeight: 20, marginTop: 11, marginBottom: 24, maxWidth: 340},
  card: {backgroundColor: '#1a1e2a', borderColor: '#2a2f3d', borderWidth: 1, borderRadius: 17, padding: 17, marginBottom: 13}, sectionHead: {flexDirection: 'row', alignItems: 'center', marginBottom: 18}, number: {fontSize: 11, color: '#ed805c', fontWeight: '800', letterSpacing: 1, marginRight: 12}, sectionTitle: {fontSize: 16, color: '#f4f1eb', fontWeight: '700'}, sectionHint: {fontSize: 11, color: '#8991a0', marginTop: 3},
  label: {fontSize: 9, fontWeight: '800', letterSpacing: 1.1, color: '#8f97a6', marginBottom: 7}, input: {height: 45, borderWidth: 1, borderColor: '#373d4d', backgroundColor: '#121620', color: '#f5f2eb', borderRadius: 10, paddingHorizontal: 12, fontSize: 12, marginBottom: 11},
  button: {minHeight: 46, borderRadius: 10, paddingHorizontal: 14, backgroundColor: '#272d3b', borderWidth: 1, borderColor: '#3a4152', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flex: 1}, buttonPrimary: {backgroundColor: '#ed805c', borderColor: '#ed805c'}, buttonDanger: {backgroundColor: '#39252a', borderColor: '#79404a'}, buttonDisabled: {opacity: 0.42}, buttonText: {color: '#e6e9ef', fontSize: 10, letterSpacing: 1, fontWeight: '800'}, buttonTextPrimary: {color: '#171923'}, buttonArrow: {color: '#9ca5b4', fontSize: 16}, packageRow: {borderTopColor: '#2c3240', borderTopWidth: 1, marginTop: 13, paddingTop: 12}, packageLabel: {fontSize: 8, color: '#778091', fontWeight: '800', letterSpacing: 1, marginBottom: 5}, packageNames: {fontSize: 10, color: '#bac1cc'},
  consentRow: {flexDirection: 'row', gap: 9}, currentConsent: {fontSize: 9, color: '#8790a0', letterSpacing: 1, marginTop: 12, fontWeight: '700'}, consentValue: {color: '#f0b29d'}, eventPreview: {backgroundColor: '#121620', borderWidth: 1, borderColor: '#303646', borderRadius: 10, padding: 12, marginBottom: 11}, eventType: {fontFamily: 'monospace', fontSize: 11, color: '#e9aa94'}, previewCaption: {fontSize: 9, color: '#778091', marginTop: 5}, footnote: {fontSize: 10, lineHeight: 15, color: '#808998', marginTop: 10},
  logPanel: {backgroundColor: '#141822', borderWidth: 1, borderColor: '#323847', borderRadius: 17, padding: 17, marginTop: 7}, logHeader: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'}, logEyebrow: {fontSize: 8, fontWeight: '800', color: '#ed805c', letterSpacing: 1.5}, logTitle: {fontSize: 18, color: '#f5f2eb', fontWeight: '700', marginTop: 4}, logCount: {width: 31, height: 31, borderRadius: 9, backgroundColor: '#272d3a', alignItems: 'center', justifyContent: 'center'}, logCountText: {fontSize: 11, color: '#d9dee6', fontFamily: 'monospace'}, logDescription: {fontSize: 10, color: '#858d9c', lineHeight: 15, marginTop: 8, marginBottom: 13}, emptyLog: {alignItems: 'center', borderTopColor: '#2b303e', borderTopWidth: 1, paddingTop: 16, paddingBottom: 5}, emptyGlyph: {fontSize: 26, color: '#737c8b'}, emptyText: {fontSize: 10, color: '#818998', textAlign: 'center', marginTop: 5}, logEntry: {borderTopWidth: 1, borderTopColor: '#2b303e', paddingVertical: 11}, logMeta: {flexDirection: 'row', alignItems: 'center', marginBottom: 7}, logDot: {width: 6, height: 6, backgroundColor: '#e6aa7e', borderRadius: 4, marginRight: 7}, logDotGood: {backgroundColor: '#79d2a2'}, logDotWarn: {backgroundColor: '#e88787'}, logEntryTitle: {color: '#dce1e9', fontSize: 10, fontWeight: '700', flex: 1}, logTime: {fontSize: 9, color: '#727b8b', fontFamily: 'monospace'}, code: {backgroundColor: '#0d1119', color: '#b7c6d2', borderRadius: 7, padding: 9, fontSize: 9, lineHeight: 14, fontFamily: 'monospace'},
  footer: {textAlign: 'center', color: '#596171', fontSize: 8, letterSpacing: 1.3, marginTop: 22}
});
