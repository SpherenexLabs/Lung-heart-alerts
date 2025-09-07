// // Dashboard.js - Updated with Graphs and Fixed Blood Pressure Handling
// import React, { useState, useEffect, useRef } from 'react';
// import { initializeApp, getApps, getApp } from 'firebase/app';
// import { getDatabase, ref, onValue, update } from 'firebase/database';
// import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, AreaChart, Area, BarChart, Bar } from 'recharts';
// import './MedicalDashboard.css';

// // Firebase Configuration
// const firebaseConfig = {
//   apiKey: "AIzaSyAhLCi6JBT5ELkAFxTplKBBDdRdpATzQxI",
//   authDomain: "smart-medicine-vending-machine.firebaseapp.com",
//   databaseURL: "https://smart-medicine-vending-machine-default-rtdb.asia-southeast1.firebasedatabase.app",
//   projectId: "smart-medicine-vending-machine",
//   storageBucket: "smart-medicine-vending-machine.firebasestorage.app",
//   messagingSenderId: "705021997077",
//   appId: "1:705021997077:web:5af9ec0b267e597e1d5e1c",
//   measurementId: "G-PH0XLJSYVS"
// };

// // Initialize Firebase with unique app name
// const appName = 'medical-dashboard-app';
// let app;
// try {
//   app = getApp(appName);
// } catch {
//   app = initializeApp(firebaseConfig, appName);
// }
// const database = getDatabase(app);

// // ---- helpers ----
// const isActiveFlag = (v) => v === 1 || v === '1' || v === true;

// const toNumber = (v) => {
//   if (v === null || v === undefined || v === '' || v === 'null' || v === 'undefined') return NaN;
//   const n = Number(v);
//   return Number.isFinite(n) ? n : NaN;
// };

// const Dashboard = () => {
//   const [patientData, setPatientData] = useState(null);
//   const [alerts, setAlerts] = useState([]);
//   const [showAlert, setShowAlert] = useState(false);
//   const [connectionStatus, setConnectionStatus] = useState('connecting');
  
//   // Historical data for graphs
//   const [historicalData, setHistoricalData] = useState([]);
//   const maxDataPoints = 20; // Keep last 20 data points

//   // guard against rapid rewrites
//   const lastWriteRef = useRef({}); // { '1_cough': 1, ... }
//   const writingRef = useRef(false);

//   useEffect(() => {
//     const nodePath = 'KS5160_Lung_Heart';
//     const dataRef = ref(database, nodePath);

//     const unsub = onValue(
//       dataRef,
//       (snap) => {
//         const data = snap.val();
//         if (data) {
//           setPatientData(data);
//           setConnectionStatus('connected');
//           checkForAlerts(data);
          
//           // Add to historical data for graphs
//           addToHistoricalData(data);
          
//           // after we render alerts, also try auto-notifications
//           maybeTriggerAutoNotifications(data, nodePath);
//         }
//       },
//       (err) => {
//         console.error('Firebase connection error:', err);
//         setConnectionStatus('error');
//       }
//     );

//     return () => unsub();
//   }, []);

//   const addToHistoricalData = (data) => {
//     const sensorData = data['1_Sensor_Data'] || {};
//     const timestamp = new Date();
//     const timeString = timestamp.toLocaleTimeString();
    
//     // Extract blood pressure values
//     const bpData = sensorData['5_bp'] || {};
//     const systolic = toNumber(bpData['2_systolic']);
//     const diastolic = toNumber(bpData['1_diastolic']);
    
//     const newDataPoint = {
//       time: timeString,
//       timestamp: timestamp.getTime(),
//       temperature: toNumber(sensorData['3_temp']) || null,
//       heartRate: toNumber(sensorData['6_hr']) || null,
//       systolic: Number.isFinite(systolic) ? systolic : null,
//       diastolic: Number.isFinite(diastolic) ? diastolic : null,
//       spo2: toNumber(sensorData['7_spo2']) || null,
//       humidity: toNumber(sensorData['4_hum']) || null,
//       alcohol: toNumber(sensorData['2_alcohol']) || null,
//       soundLevel: toNumber(sensorData['8_sound']) || null,
//       co2: sensorData['1_co2'] === true ? 1 : 0
//     };

//     setHistoricalData(prev => {
//       const updated = [...prev, newDataPoint];
//       // Keep only the last maxDataPoints
//       return updated.slice(-maxDataPoints);
//     });
//   };

//   const checkForAlerts = (data) => {
//     const newAlerts = [];
//     const sensorData = data['1_Sensor_Data'];
//     const notificationData = data['2_Notification'];

//     if (sensorData) {
//       const temp = toNumber(sensorData['3_temp']);
//       if (Number.isFinite(temp) && temp > 38) {
//         newAlerts.push({
//           id: `temp-${Date.now()}`,
//           type: 'critical',
//           message: `High Temperature: ${temp}°C`,
//           timestamp: new Date().toLocaleTimeString()
//         });
//       }

//       const hr = toNumber(sensorData['6_hr']);
//       if (Number.isFinite(hr) && hr > 100) {
//         newAlerts.push({
//           id: `hr-${Date.now()}`,
//           type: 'warning',
//           message: `High Heart Rate: ${hr} BPM`,
//           timestamp: new Date().toLocaleTimeString()
//         });
//       }

//       const spo2 = toNumber(sensorData['7_spo2']);
//       if (Number.isFinite(spo2) && spo2 < 95) {
//         newAlerts.push({
//           id: `spo2-${Date.now()}`,
//           type: 'critical',
//           message: `Low SpO₂: ${spo2}%`,
//           timestamp: new Date().toLocaleTimeString()
//         });
//       }

//       if (sensorData['1_co2'] === true) {
//         newAlerts.push({
//           id: `co2-${Date.now()}`,
//           type: 'warning',
//           message: 'High CO₂ Level Detected',
//           timestamp: new Date().toLocaleTimeString()
//         });
//       }

//       const alcohol = toNumber(sensorData['2_alcohol']);
//       if (Number.isFinite(alcohol) && alcohol > 0) {
//         newAlerts.push({
//           id: `alcohol-${Date.now()}`,
//           type: 'info',
//           message: `Alcohol Detected: Level ${alcohol}`,
//           timestamp: new Date().toLocaleTimeString()
//         });
//       }
//     }

//     if (data['2_Notification']) {
//       const n = data['2_Notification'];
//       const soundLevel = toNumber(sensorData['8_sound']);
      
//       // Only show sound-related alerts if sound level is 1
//       if (soundLevel === 1) {
//         if (isActiveFlag(n['3_asthama'])) {
//           newAlerts.push({
//             id: `asthma-${Date.now()}`,
//             type: 'warning',
//             message: 'Asthma Alert Detected',
//             timestamp: new Date().toLocaleTimeString()
//           });
//         }
//         if (isActiveFlag(n['1_cough'])) {
//           newAlerts.push({
//             id: `cough-${Date.now()}`,
//             type: 'info',
//             message: 'Cough Detected',
//             timestamp: new Date().toLocaleTimeString()
//           });
//         }
//         if (isActiveFlag(n['2_tb'])) {
//           newAlerts.push({
//             id: `tb-${Date.now()}`,
//             type: 'critical',
//             message: 'TB Risk Alert',
//             timestamp: new Date().toLocaleTimeString()
//           });
//         }
//       }
      
//       // Hypertension alerts are independent of sound level
//       if (isActiveFlag(n['4_hypertension'])) {
//         newAlerts.push({
//           id: `hypertension-${Date.now()}`,
//           type: 'critical',
//           message: 'Hypertension Alert',
//           timestamp: new Date().toLocaleTimeString()
//         });
//       }
//     }

//     if (newAlerts.length > 0) {
//       setAlerts((prev) => [...newAlerts, ...prev.slice(0, 4)]);
//       setShowAlert(true);
//       setTimeout(() => setShowAlert(false), 8000);
//     }
//   };

//   // AUTO-WRITE LOGIC (requested):
//   // - If 8_sound == 1 => set cough/tb/asthma to 1.
//   // - If 8_sound == 0 => set cough/tb/asthma to 0.
//   // - If BP > 120/80 => set hypertension to 1.
//   const maybeTriggerAutoNotifications = async (data, nodePath) => {
//     const sensor = data?.['1_Sensor_Data'] || {};
//     const notif = data?.['2_Notification'] || {};

//     const sound = toNumber(sensor['8_sound']);

//     // BP pieces may be nested object {1_diastolic, 2_systolic}
//     const bpObj = sensor['5_bp'] || {};
//     const sys = toNumber(bpObj['2_systolic']);
//     const dia = toNumber(bpObj['1_diastolic']);

//     // Evaluate desired transitions
//     const toSet = {};

//     // Handle sound-based alerts
//     if (sound === 1) {
//       // Sound detected - set alerts to 1
//       if (!isActiveFlag(notif['1_cough'])) toSet['1_cough'] = 1;
//       if (!isActiveFlag(notif['2_tb'])) toSet['2_tb'] = 1;
//       if (!isActiveFlag(notif['3_asthama'])) toSet['3_asthama'] = 1;
//     } else if (sound === 0) {
//       // No sound detected - clear alerts to 0
//       if (isActiveFlag(notif['1_cough'])) toSet['1_cough'] = 0;
//       if (isActiveFlag(notif['2_tb'])) toSet['2_tb'] = 0;
//       if (isActiveFlag(notif['3_asthama'])) toSet['3_asthama'] = 0;
//     }

//     // "More than 120/80": either systolic > 120 OR diastolic > 80
//     if ((Number.isFinite(sys) && sys > 120) || (Number.isFinite(dia) && dia > 80)) {
//       if (!isActiveFlag(notif['4_hypertension'])) toSet['4_hypertension'] = 1;
//     }

//     // If nothing to update or currently writing, skip
//     if (Object.keys(toSet).length === 0 || writingRef.current) return;

//     // Skip if these exact keys were already written very recently (simple memory)
//     const already = Object.entries(toSet).every(([k, v]) => lastWriteRef.current[k] === v);
//     if (already) return;

//     try {
//       writingRef.current = true;
//       await update(ref(database, `${nodePath}/2_Notification`), toSet);
//       // Remember last written states
//       lastWriteRef.current = { ...lastWriteRef.current, ...toSet };
//       writingRef.current = false;
//     } catch (e) {
//       console.error('Failed to update notifications:', e);
//       writingRef.current = false;
//     }
//   };

//   const dismissAlert = (id) => setAlerts((prev) => prev.filter((a) => a.id !== id));

//   const getAlertIcon = (type) => {
//     switch (type) {
//       case 'critical': return '!';
//       case 'warning': return '!';
//       case 'info': return 'i';
//       default: return '*';
//     }
//   };

//   const getVitalStatus = (value, type) => {
//     if (value === null || value === undefined || value === "") return 'normal';
//     const numValue = parseFloat(value);
//     switch (type) {
//       case 'temp':
//         if (numValue > 38) return 'critical';
//         if (numValue > 37.5) return 'warning';
//         return 'normal';
//       case 'hr':
//         if (numValue > 100 || numValue < 60) return 'warning';
//         return 'normal';
//       case 'bp':
//         if (numValue > 180) return 'critical';
//         if (numValue > 140) return 'warning';
//         return 'normal';
//       case 'spo2':
//         if (numValue < 90) return 'critical';
//         if (numValue < 95) return 'warning';
//         return 'normal';
//       default:
//         return 'normal';
//     }
//   };

//   const getSensorValue = (sensorKey, defaultValue = 'N/A') => {
//     const sensorData = patientData?.['1_Sensor_Data'];
//     if (!sensorData) return defaultValue;
//     const value = sensorData[sensorKey];
//     if (value === null || value === undefined || value === "") return defaultValue;
//     return value;
//   };

//   const getBloodPressureDisplay = () => {
//     const sensorData = patientData?.['1_Sensor_Data'];
//     if (!sensorData || !sensorData['5_bp']) {
//       return { display: 'No Data', status: 'normal', statusText: 'No Data' };
//     }
//     const bpData = sensorData['5_bp'];
//     let systolic = bpData['2_systolic'];
//     let diastolic = bpData['1_diastolic'];
//     if (systolic === null || systolic === undefined) systolic = "";
//     if (diastolic === null || diastolic === undefined) diastolic = "";
//     systolic = String(systolic).trim();
//     diastolic = String(diastolic).trim();

//     if ((systolic === "" || systolic === "null" || systolic === "undefined") &&
//         (diastolic === "" || diastolic === "null" || diastolic === "undefined")) {
//       return { display: 'Awaiting Data', status: 'normal', statusText: 'Pending' };
//     }

//     const sysDisplay = (systolic === "" || systolic === "null" || systolic === "undefined") ? "--" : systolic;
//     const diaDisplay = (diastolic === "" || diastolic === "null" || diastolic === "undefined") ? "--" : diastolic;
//     const displayText = `${sysDisplay}/${diaDisplay}`;

//     let status = 'normal';
//     let statusText = 'Normal';
//     if (systolic && systolic !== "null" && systolic !== "undefined" && !isNaN(Number(systolic))) {
//       const sysNum = Number(systolic);
//       if (sysNum >= 180) { status = 'critical'; statusText = 'Critical'; }
//       else if (sysNum >= 140) { status = 'warning'; statusText = 'High'; }
//       else if (sysNum < 90) { status = 'warning'; statusText = 'Low'; }
//     }
//     return { display: displayText, status, statusText };
//   };

//   // Custom tooltip for charts
//   const CustomTooltip = ({ active, payload, label }) => {
//     if (active && payload && payload.length) {
//       return (
//         <div style={{
//           backgroundColor: 'rgba(255, 255, 255, 0.95)',
//           padding: '10px',
//           border: '1px solid #ccc',
//           borderRadius: '5px',
//           boxShadow: '0 2px 5px rgba(0,0,0,0.1)'
//         }}>
//           <p style={{ margin: 0, fontWeight: 'bold' }}>{`Time: ${label}`}</p>
//           {payload.map((entry, index) => (
//             <p key={index} style={{ margin: '2px 0', color: entry.color }}>
//               {`${entry.dataKey}: ${entry.value}${entry.dataKey === 'temperature' ? '°C' : 
//                 entry.dataKey === 'heartRate' ? ' BPM' : 
//                 entry.dataKey.includes('spo2') ? '%' : 
//                 entry.dataKey.includes('systolic') || entry.dataKey.includes('diastolic') ? ' mmHg' : 
//                 entry.dataKey === 'humidity' ? '%' : ''}`}
//             </p>
//           ))}
//         </div>
//       );
//     }
//     return null;
//   };

//   if (!patientData && connectionStatus === 'connecting') {
//     return (
//       <div className="loading">
//         <div className="loading-spinner"></div>
//         <p>Loading patient data...</p>
//       </div>
//     );
//   }

//   if (connectionStatus === 'error') {
//     return (
//       <div className="error-screen">
//         <div className="error-icon">X</div>
//         <h2>Connection Error</h2>
//         <p>Unable to connect to Firebase database. Please check your connection.</p>
//       </div>
//     );
//   }

//   const sensorData = patientData?.['1_Sensor_Data'] || {};
//   const notificationData = patientData?.['2_Notification'] || {};
//   const bpInfo = getBloodPressureDisplay();

//   return (
//     <div className="health-dashboard">
//       <header className="health-dashboard-header">
//         <h1>Health Monitoring Dashboard</h1>
//       </header>

//       {/* Alert Notifications (toasts) */}
//       <div className={`alert-container ${showAlert ? 'show' : ''}`}>
//         {alerts.map(alert => (
//           <div key={alert.id} className={`alert alert-${alert.type}`}>
//             <span className="alert-icon">{getAlertIcon(alert.type)}</span>
//             <div className="alert-content">
//               <div className="alert-message">{alert.message}</div>
//               <div className="alert-time">{alert.timestamp}</div>
//             </div>
//             <button className="alert-dismiss" onClick={() => dismissAlert(alert.id)}>×</button>
//           </div>
//         ))}
//       </div>

//       <div className="health-dashboard-content">
//         {/* Vital Signs Cards */}
//         <div className="cards-grid">
//           <div className="card">
//             <div className="card-header"><h3>Temperature</h3><span className="card-icon">🌡️</span></div>
//             <div className="card-value">{getSensorValue('3_temp')}°C</div>
//             <div className={`card-status ${getVitalStatus(getSensorValue('3_temp', 0), 'temp')}`}>
//               {getSensorValue('3_temp', 0) > 38 ? 'High' : getSensorValue('3_temp', 0) < 36 ? 'Low' : 'Normal'}
//             </div>
//           </div>

//           <div className="card">
//             <div className="card-header"><h3>Heart Rate</h3><span className="card-icon">💓</span></div>
//             <div className="card-value">{getSensorValue('6_hr')} BPM</div>
//             <div className={`card-status ${getVitalStatus(getSensorValue('6_hr', 0), 'hr')}`}>
//               {getSensorValue('6_hr', 0) > 100 ? 'High' : getSensorValue('6_hr', 0) < 60 ? 'Low' : 'Normal'}
//             </div>
//           </div>

//           {/* Blood Pressure */}
//           <div className="card">
//             <div className="card-header"><h3>Blood Pressure</h3><span className="card-icon">🩺</span></div>
//             <div className="card-value">
//               {bpInfo.display}
//               {bpInfo.display !== 'No Data' && bpInfo.display !== 'Awaiting Data' && bpInfo.display !== '--/--' && !bpInfo.display.includes('--') ? ' mmHg' : ''}
//             </div>
//             <div className={`card-status ${bpInfo.status}`}>{bpInfo.statusText}</div>
//           </div>

//           <div className="card">
//             <div className="card-header"><h3>SpO2</h3><span className="card-icon">🫁</span></div>
//             <div className="card-value">{getSensorValue('7_spo2')}%</div>
//             <div className={`card-status ${getVitalStatus(getSensorValue('7_spo2', 100), 'spo2')}`}>
//               {getSensorValue('7_spo2', 100) < 95 ? 'Low' : 'Normal'}
//             </div>
//           </div>

//           <div className="card">
//             <div className="card-header"><h3>Humidity</h3><span className="card-icon">💧</span></div>
//             <div className="card-value">{getSensorValue('4_hum')}%</div>
//             <div className="card-status normal">
//               {getSensorValue('4_hum', 0) > 80 ? 'High' : 'Normal'}
//             </div>
//           </div>

//           <div className="card">
//             <div className="card-header"><h3>Alcohol Level</h3><span className="card-icon">🍺</span></div>
//             <div className="card-value">{getSensorValue('2_alcohol')}</div>
//             <div className="card-status normal">
//               {toNumber(getSensorValue('2_alcohol', 0)) > 0 ? 'Detected' : 'Normal'}
//             </div>
//           </div>

//           <div className="card">
//             <div className="card-header"><h3>CO₂ Level</h3><span className="card-icon">🌬️</span></div>
//             <div className="card-value">{getSensorValue('1_co2') === true ? 'Detected' : 'Normal'}</div>
//             <div className={`card-status ${getSensorValue('1_co2') === true ? 'warning' : 'normal'}`}>
//               {getSensorValue('1_co2') === true ? 'High' : 'Normal'}
//             </div>
//           </div>

//           <div className="card">
//             <div className="card-header"><h3>Sound Level</h3><span className="card-icon">🔊</span></div>
//             <div className="card-value">{getSensorValue('8_sound')}</div>
//             <div className="card-status normal">Normal</div>
//           </div>
//         </div>

//         {/* Charts Section */}
//         {historicalData.length > 0 && (
//           <div className="charts-section">
//             <h2>Vital Signs Trends</h2>
            
//             <div className="charts-grid">
//               {/* Temperature Chart */}
//               <div className="chart-container">
//                 <h3>Temperature Over Time</h3>
//                 <ResponsiveContainer width="100%" height={300}>
//                   <AreaChart data={historicalData}>
//                     <CartesianGrid strokeDasharray="3 3" />
//                     <XAxis dataKey="time" />
//                     <YAxis domain={['dataMin - 1', 'dataMax + 1']} />
//                     <Tooltip content={<CustomTooltip />} />
//                     <Area 
//                       type="monotone" 
//                       dataKey="temperature" 
//                       stroke="#ff6b6b" 
//                       fill="#ff6b6b" 
//                       fillOpacity={0.6}
//                       connectNulls={false}
//                     />
//                   </AreaChart>
//                 </ResponsiveContainer>
//               </div>

//               {/* Heart Rate Chart */}
//               <div className="chart-container">
//                 <h3>Heart Rate Over Time</h3>
//                 <ResponsiveContainer width="100%" height={300}>
//                   <LineChart data={historicalData}>
//                     <CartesianGrid strokeDasharray="3 3" />
//                     <XAxis dataKey="time" />
//                     <YAxis domain={['dataMin - 10', 'dataMax + 10']} />
//                     <Tooltip content={<CustomTooltip />} />
//                     <Line 
//                       type="monotone" 
//                       dataKey="heartRate" 
//                       stroke="#4ecdc4" 
//                       strokeWidth={3}
//                       dot={{ fill: '#4ecdc4', strokeWidth: 2, r: 4 }}
//                       connectNulls={false}
//                     />
//                   </LineChart>
//                 </ResponsiveContainer>
//               </div>

//               {/* Blood Pressure Chart */}
//               <div className="chart-container">
//                 <h3>Blood Pressure Over Time</h3>
//                 <ResponsiveContainer width="100%" height={300}>
//                   <LineChart data={historicalData}>
//                     <CartesianGrid strokeDasharray="3 3" />
//                     <XAxis dataKey="time" />
//                     <YAxis domain={['dataMin - 20', 'dataMax + 20']} />
//                     <Tooltip content={<CustomTooltip />} />
//                     <Legend />
//                     <Line 
//                       type="monotone" 
//                       dataKey="systolic" 
//                       stroke="#e74c3c" 
//                       strokeWidth={2}
//                       dot={{ fill: '#e74c3c', strokeWidth: 2, r: 3 }}
//                       name="Systolic"
//                       connectNulls={false}
//                     />
//                     <Line 
//                       type="monotone" 
//                       dataKey="diastolic" 
//                       stroke="#3498db" 
//                       strokeWidth={2}
//                       dot={{ fill: '#3498db', strokeWidth: 2, r: 3 }}
//                       name="Diastolic"
//                       connectNulls={false}
//                     />
//                   </LineChart>
//                 </ResponsiveContainer>
//               </div>

//               {/* SpO2 Chart */}
//               <div className="chart-container">
//                 <h3>SpO₂ Over Time</h3>
//                 <ResponsiveContainer width="100%" height={300}>
//                   <AreaChart data={historicalData}>
//                     <CartesianGrid strokeDasharray="3 3" />
//                     <XAxis dataKey="time" />
//                     <YAxis domain={['dataMin - 5', 'dataMax + 2']} />
//                     <Tooltip content={<CustomTooltip />} />
//                     <Area 
//                       type="monotone" 
//                       dataKey="spo2" 
//                       stroke="#9b59b6" 
//                       fill="#9b59b6" 
//                       fillOpacity={0.6}
//                       connectNulls={false}
//                     />
//                   </AreaChart>
//                 </ResponsiveContainer>
//               </div>

//               {/* Sound Level Chart */}
//               <div className="chart-container">
//                 <h3>Sound Level Over Time</h3>
//                 <ResponsiveContainer width="100%" height={300}>
//                   <BarChart data={historicalData}>
//                     <CartesianGrid strokeDasharray="3 3" />
//                     <XAxis dataKey="time" />
//                     <YAxis />
//                     <Tooltip content={<CustomTooltip />} />
//                     <Bar dataKey="soundLevel" fill="#f39c12" />
//                   </BarChart>
//                 </ResponsiveContainer>
//               </div>

//               {/* Environmental Factors */}
//               <div className="chart-container">
//                 <h3>Environmental Factors</h3>
//                 <ResponsiveContainer width="100%" height={300}>
//                   <LineChart data={historicalData}>
//                     <CartesianGrid strokeDasharray="3 3" />
//                     <XAxis dataKey="time" />
//                     <YAxis />
//                     <Tooltip content={<CustomTooltip />} />
//                     <Legend />
//                     <Line 
//                       type="monotone" 
//                       dataKey="humidity" 
//                       stroke="#27ae60" 
//                       strokeWidth={2}
//                       name="Humidity (%)"
//                       connectNulls={false}
//                     />
//                     <Line 
//                       type="monotone" 
//                       dataKey="co2" 
//                       stroke="#e67e22" 
//                       strokeWidth={2}
//                       name="CO₂ Level"
//                       connectNulls={false}
//                     />
//                   </LineChart>
//                 </ResponsiveContainer>
//               </div>
//             </div>
//           </div>
//         )}

//         {/* Notification Status */}
//         <div className="notification-panel">
//           <h3>Health Condition Alerts</h3>
//           <div className="notification-grid">
//             <div className={`notification-item ${isActiveFlag(notificationData['3_asthama']) ? 'active' : 'inactive'}`}>
//               <span className="notification-icon">🫁</span>
//               <span className="notification-label">Asthma</span>
//               <span className={`notification-status ${isActiveFlag(notificationData['3_asthama']) ? 'alert' : 'normal'}`}>
//                 {isActiveFlag(notificationData['3_asthama']) ? 'ALERT' : 'Normal'}
//               </span>
//             </div>

//             <div className={`notification-item ${isActiveFlag(notificationData['4_hypertension']) ? 'active' : 'inactive'}`}>
//               <span className="notification-icon">💔</span>
//               <span className="notification-label">Hypertension</span>
//               <span className={`notification-status ${isActiveFlag(notificationData['4_hypertension']) ? 'alert' : 'normal'}`}>
//                 {isActiveFlag(notificationData['4_hypertension']) ? 'ALERT' : 'Normal'}
//               </span>
//             </div>

//             <div className={`notification-item ${isActiveFlag(notificationData['1_cough']) ? 'active' : 'inactive'}`}>
//               <span className="notification-icon">🤧</span>
//               <span className="notification-label">Cough</span>
//               <span className={`notification-status ${isActiveFlag(notificationData['1_cough']) ? 'alert' : 'normal'}`}>
//                 {isActiveFlag(notificationData['1_cough']) ? 'DETECTED' : 'Normal'}
//               </span>
//             </div>

//             <div className={`notification-item ${isActiveFlag(notificationData['2_tb']) ? 'active' : 'inactive'}`}>
//               <span className="notification-icon">🦠</span>
//               <span className="notification-label">TB Risk</span>
//               <span className={`notification-status ${isActiveFlag(notificationData['2_tb']) ? 'alert' : 'normal'}`}>
//                 {isActiveFlag(notificationData['2_tb']) ? 'ALERT' : 'Normal'}
//               </span>
//             </div>
//           </div>
//         </div>
//       </div>

//       <style jsx>{`
//         .charts-section {
//           margin: 2rem 0;
//           padding: 1.5rem;
//           background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
//           border-radius: 15px;
//           box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
//         }
        
//         .charts-section h2 {
//           text-align: center;
//           color: #2c3e50;
//           margin-bottom: 2rem;
//           font-size: 1.8rem;
//           font-weight: bold;
//         }
        
//         .charts-grid {
//           display: grid;
//           grid-template-columns: repeat(auto-fit, minmax(500px, 1fr));
//           gap: 2rem;
//         }
        
//         .chart-container {
//           background: white;
//           padding: 1.5rem;
//           border-radius: 12px;
//           box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
//           border: 1px solid #e1e8ed;
//         }
        
//         .chart-container h3 {
//           margin: 0 0 1rem 0;
//           color: #34495e;
//           font-size: 1.2rem;
//           font-weight: 600;
//           text-align: center;
//         }
        
//         .loading {
//           display: flex;
//           flex-direction: column;
//           align-items: center;
//           justify-content: center;
//           height: 100vh;
//           background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
//           color: white;
//         }
        
//         .loading-spinner {
//           width: 50px;
//           height: 50px;
//           border: 4px solid rgba(255, 255, 255, 0.3);
//           border-top: 4px solid white;
//           border-radius: 50%;
//           animation: spin 1s linear infinite;
//           margin-bottom: 1rem;
//         }
        
//         @keyframes spin {
//           0% { transform: rotate(0deg); }
//           100% { transform: rotate(360deg); }
//         }
        
//         .error-screen {
//           display: flex;
//           flex-direction: column;
//           align-items: center;
//           justify-content: center;
//           height: 100vh;
//           background: linear-gradient(135deg, #ff6b6b 0%, #ee5a24 100%);
//           color: white;
//           text-align: center;
//         }
        
//         .error-icon {
//           font-size: 4rem;
//           margin-bottom: 1rem;
//         }
        
//         .health-dashboard {
//           min-height: 100vh;
//           background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
//           font-family: 'Arial', sans-serif;
//         }
        
//         .health-dashboard-header {
//           background: rgba(255, 255, 255, 0.95);
//           padding: 1.5rem;
//           box-shadow: 0 2px 20px rgba(0, 0, 0, 0.1);
//           backdrop-filter: blur(10px);
//         }
        
//         .health-dashboard-header h1 {
//           margin: 0;
//           color: #2c3e50;
//           font-size: 2rem;
//           font-weight: bold;
//         }
        
//         .patient-info {
//           display: flex;
//           justify-content: space-between;
//           margin-top: 0.5rem;
//           font-size: 0.9rem;
//           color: #7f8c8d;
//         }
        
//         .health-dashboard-content {
//           padding: 2rem;
//         }
        
//         .cards-grid {
//           display: grid;
//           grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
//           gap: 1.5rem;
//           margin-bottom: 2rem;
//         }
        
//         .card {
//           background: rgba(255, 255, 255, 0.95);
//           padding: 1.5rem;
//           border-radius: 15px;
//           box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
//           backdrop-filter: blur(10px);
//           border: 1px solid rgba(255, 255, 255, 0.2);
//           transition: transform 0.3s ease, box-shadow 0.3s ease;
//         }
        
//         .card:hover {
//           transform: translateY(-5px);
//           box-shadow: 0 15px 40px rgba(0, 0, 0, 0.15);
//         }
        
//         .card-header {
//           display: flex;
//           justify-content: space-between;
//           align-items: center;
//           margin-bottom: 1rem;
//         }
        
//         .card-header h3 {
//           margin: 0;
//           color: #34495e;
//           font-size: 1.1rem;
//         }
        
//         .card-icon {
//           font-size: 1.5rem;
//         }
        
//         .card-value {
//           font-size: 2rem;
//           font-weight: bold;
//           color: #2c3e50;
//           margin-bottom: 0.5rem;
//         }
        
//         .card-status {
//           padding: 0.3rem 0.8rem;
//           border-radius: 20px;
//           font-size: 0.85rem;
//           font-weight: 600;
//           text-transform: uppercase;
//         }
        
//         .card-status.normal {
//           background: #d5f4e6;
//           color: #27ae60;
//         }
        
//         .card-status.warning {
//           background: #fef9e7;
//           color: #f39c12;
//         }
        
//         .card-status.critical {
//           background: #fadbd8;
//           color: #e74c3c;
//         }
        
//         .notification-panel {
//           background: rgba(255, 255, 255, 0.95);
//           padding: 1.5rem;
//           border-radius: 15px;
//           box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
//           backdrop-filter: blur(10px);
//           margin-top: 2rem;
//         }
        
//         .notification-panel h3 {
//           margin: 0 0 1.5rem 0;
//           color: #2c3e50;
//           font-size: 1.3rem;
//         }
        
//         .notification-grid {
//           display: grid;
//           grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
//           gap: 1rem;
//         }
        
//         .notification-item {
//           display: flex;
//           align-items: center;
//           padding: 1rem;
//           border-radius: 10px;
//           border: 2px solid #ecf0f1;
//           transition: all 0.3s ease;
//         }
        
//         .notification-item.active {
//           border-color: #e74c3c;
//           background: #fadbd8;
//         }
        
//         .notification-item.inactive {
//           border-color: #27ae60;
//           background: #d5f4e6;
//         }
        
//         .notification-icon {
//           font-size: 1.5rem;
//           margin-right: 1rem;
//         }
        
//         .notification-label {
//           flex: 1;
//           font-weight: 600;
//           color: #34495e;
//         }
        
//         .notification-status {
//           padding: 0.3rem 0.8rem;
//           border-radius: 15px;
//           font-size: 0.8rem;
//           font-weight: bold;
//         }
        
//         .notification-status.alert {
//           background: #e74c3c;
//           color: white;
//         }
        
//         .notification-status.normal {
//           background: #27ae60;
//           color: white;
//         }
        
//         .alert-container {
//           position: fixed;
//           top: 20px;
//           right: 20px;
//           z-index: 1000;
//           opacity: 0;
//           transform: translateX(100%);
//           transition: all 0.3s ease;
//         }
        
//         .alert-container.show {
//           opacity: 1;
//           transform: translateX(0);
//         }
        
//         .alert {
//           display: flex;
//           align-items: center;
//           margin-bottom: 0.5rem;
//           padding: 1rem;
//           border-radius: 8px;
//           box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
//           min-width: 300px;
//           max-width: 400px;
//         }
        
//         .alert-critical {
//           background: #fadbd8;
//           border-left: 4px solid #e74c3c;
//         }
        
//         .alert-warning {
//           background: #fef9e7;
//           border-left: 4px solid #f39c12;
//         }
        
//         .alert-info {
//           background: #d6eaf8;
//           border-left: 4px solid #3498db;
//         }
        
//         .alert-icon {
//           background: #e74c3c;
//           color: white;
//           width: 24px;
//           height: 24px;
//           border-radius: 50%;
//           display: flex;
//           align-items: center;
//           justify-content: center;
//           font-weight: bold;
//           margin-right: 1rem;
//           font-size: 0.8rem;
//         }
        
//         .alert-content {
//           flex: 1;
//         }
        
//         .alert-message {
//           font-weight: 600;
//           margin-bottom: 0.2rem;
//         }
        
//         .alert-time {
//           font-size: 0.8rem;
//           color: #7f8c8d;
//         }
        
//         .alert-dismiss {
//           background: none;
//           border: none;
//           font-size: 1.2rem;
//           cursor: pointer;
//           color: #7f8c8d;
//           padding: 0;
//           margin-left: 0.5rem;
//         }
        
//         .alert-dismiss:hover {
//           color: #2c3e50;
//         }
        
//         @media (max-width: 768px) {
//           .health-dashboard-content {
//             padding: 1rem;
//           }
          
//           .cards-grid, .charts-grid {
//             grid-template-columns: 1fr;
//           }
          
//           .patient-info {
//             flex-direction: column;
//           }
          
//           .alert-container {
//             right: 10px;
//             left: 10px;
//           }
          
//           .alert {
//             min-width: auto;
//           }
          
//           .chart-container {
//             min-width: 300px;
//           }
//         }
//       `}</style>
//     </div>
//   );
// };

// export default Dashboard;








// Dashboard.js - Updated with Graphs and Fixed Blood Pressure Handling
import React, { useState, useEffect, useRef } from 'react';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getDatabase, ref, onValue, update } from 'firebase/database';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, AreaChart, Area, BarChart, Bar } from 'recharts';
import './MedicalDashboard.css';

// Firebase Configuration
const firebaseConfig = {
  apiKey: "AIzaSyAhLCi6JBT5ELkAFxTplKBBDdRdpATzQxI",
  authDomain: "smart-medicine-vending-machine.firebaseapp.com",
  databaseURL: "https://smart-medicine-vending-machine-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "smart-medicine-vending-machine",
  storageBucket: "smart-medicine-vending-machine.firebasestorage.app",
  messagingSenderId: "705021997077",
  appId: "1:705021997077:web:5af9ec0b267e597e1d5e1c",
  measurementId: "G-PH0XLJSYVS"
};

// Initialize Firebase with unique app name
const appName = 'medical-dashboard-app';
let app;
try {
  app = getApp(appName);
} catch {
  app = initializeApp(firebaseConfig, appName);
}
const database = getDatabase(app);

// ---- helpers ----
const isActiveFlag = (v) => v === 1 || v === '1' || v === true;

const toNumber = (v) => {
  if (v === null || v === undefined || v === '' || v === 'null' || v === 'undefined') return NaN;
  const n = Number(v);
  return Number.isFinite(n) ? n : NaN;
};

const Dashboard = () => {
  const [patientData, setPatientData] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [showAlert, setShowAlert] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('connecting');
  
  // Historical data for graphs
  const [historicalData, setHistoricalData] = useState([]);
  const maxDataPoints = 20; // Keep last 20 data points

  // guard against rapid rewrites
  const lastWriteRef = useRef({}); // { '1_cough': 1, ... }
  const writingRef = useRef(false);

  useEffect(() => {
    const nodePath = 'KS5160_Lung_Heart';
    const dataRef = ref(database, nodePath);

    const unsub = onValue(
      dataRef,
      (snap) => {
        const data = snap.val();
        if (data) {
          setPatientData(data);
          setConnectionStatus('connected');
          checkForAlerts(data);
          
          // Add to historical data for graphs
          addToHistoricalData(data);
          
          // after we render alerts, also try auto-notifications
          maybeTriggerAutoNotifications(data, nodePath);
        }
      },
      (err) => {
        console.error('Firebase connection error:', err);
        setConnectionStatus('error');
      }
    );

    return () => unsub();
  }, []);

  const addToHistoricalData = (data) => {
    const sensorData = data['1_Sensor_Data'] || {};
    const timestamp = new Date();
    const timeString = timestamp.toLocaleTimeString();
    
    // Extract blood pressure values
    const bpData = sensorData['5_bp'] || {};
    const systolic = toNumber(bpData['2_systolic']);
    const diastolic = toNumber(bpData['1_diastolic']);
    
    const newDataPoint = {
      time: timeString,
      timestamp: timestamp.getTime(),
      temperature: toNumber(sensorData['3_temp']) || null,
      heartRate: toNumber(sensorData['6_hr']) || null,
      systolic: Number.isFinite(systolic) ? systolic : null,
      diastolic: Number.isFinite(diastolic) ? diastolic : null,
      spo2: toNumber(sensorData['7_spo2']) || null,
      humidity: toNumber(sensorData['4_hum']) || null,
      alcohol: toNumber(sensorData['2_alcohol']) || null,
      soundLevel: toNumber(sensorData['8_sound']) || null,
      co2: sensorData['1_co2'] === true ? 1 : 0
    };

    setHistoricalData(prev => {
      const updated = [...prev, newDataPoint];
      // Keep only the last maxDataPoints
      return updated.slice(-maxDataPoints);
    });
  };

  const checkForAlerts = (data) => {
    const newAlerts = [];
    const sensorData = data['1_Sensor_Data'];
    const notificationData = data['2_Notification'];

    if (sensorData) {
      const temp = toNumber(sensorData['3_temp']);
      if (Number.isFinite(temp) && temp > 38) {
        newAlerts.push({
          id: `temp-${Date.now()}`,
          type: 'critical',
          message: `High Temperature: ${temp}°C`,
          timestamp: new Date().toLocaleTimeString()
        });
      }

      const hr = toNumber(sensorData['6_hr']);
      if (Number.isFinite(hr) && hr > 100) {
        newAlerts.push({
          id: `hr-${Date.now()}`,
          type: 'warning',
          message: `High Heart Rate: ${hr} BPM`,
          timestamp: new Date().toLocaleTimeString()
        });
      }

      const spo2 = toNumber(sensorData['7_spo2']);
      if (Number.isFinite(spo2) && spo2 < 95) {
        newAlerts.push({
          id: `spo2-${Date.now()}`,
          type: 'critical',
          message: `Low SpO₂: ${spo2}%`,
          timestamp: new Date().toLocaleTimeString()
        });
      }

      if (sensorData['1_co2'] === true) {
        newAlerts.push({
          id: `co2-${Date.now()}`,
          type: 'warning',
          message: 'High CO₂ Level Detected',
          timestamp: new Date().toLocaleTimeString()
        });
      }

      const alcohol = toNumber(sensorData['2_alcohol']);
      if (Number.isFinite(alcohol) && alcohol > 0) {
        newAlerts.push({
          id: `alcohol-${Date.now()}`,
          type: 'info',
          message: `Alcohol Detected: Level ${alcohol}`,
          timestamp: new Date().toLocaleTimeString()
        });
      }
    }

    if (data['2_Notification']) {
      const n = data['2_Notification'];
      const soundLevel = toNumber(sensorData['8_sound']);
      
      // Only show sound-related alerts if sound level is 1
      if (soundLevel === 1) {
        if (isActiveFlag(n['3_asthama'])) {
          newAlerts.push({
            id: `asthma-${Date.now()}`,
            type: 'warning',
            message: 'Asthma Alert Detected',
            timestamp: new Date().toLocaleTimeString()
          });
        }
        if (isActiveFlag(n['1_cough'])) {
          newAlerts.push({
            id: `cough-${Date.now()}`,
            type: 'info',
            message: 'Cough Detected',
            timestamp: new Date().toLocaleTimeString()
          });
        }
        if (isActiveFlag(n['2_tb'])) {
          newAlerts.push({
            id: `tb-${Date.now()}`,
            type: 'critical',
            message: 'TB Risk Alert',
            timestamp: new Date().toLocaleTimeString()
          });
        }
      }
      
      // Hypertension alerts only when BP is actually high
      const bpObj = sensorData['5_bp'] || {};
      const systolic = toNumber(bpObj['2_systolic']);
      const diastolic = toNumber(bpObj['1_diastolic']);
      const isBPHigh = (Number.isFinite(systolic) && systolic > 120) || (Number.isFinite(diastolic) && diastolic > 80);
      
      if (isBPHigh && isActiveFlag(n['4_hypertension'])) {
        newAlerts.push({
          id: `hypertension-${Date.now()}`,
          type: 'critical',
          message: 'Hypertension Alert',
          timestamp: new Date().toLocaleTimeString()
        });
      }
    }

    if (newAlerts.length > 0) {
      setAlerts((prev) => [...newAlerts, ...prev.slice(0, 4)]);
      setShowAlert(true);
      setTimeout(() => setShowAlert(false), 8000);
    }
  };

  // AUTO-WRITE LOGIC (requested):
  // - If 8_sound == 1 => set cough/tb/asthma to 1.
  // - If 8_sound == 0 => set cough/tb/asthma to 0.
  // - If BP > 120/80 => set hypertension to 1.
  const maybeTriggerAutoNotifications = async (data, nodePath) => {
    const sensor = data?.['1_Sensor_Data'] || {};
    const notif = data?.['2_Notification'] || {};

    const sound = toNumber(sensor['8_sound']);

    // BP pieces may be nested object {1_diastolic, 2_systolic}
    const bpObj = sensor['5_bp'] || {};
    const sys = toNumber(bpObj['2_systolic']);
    const dia = toNumber(bpObj['1_diastolic']);

    // Evaluate desired transitions
    const toSet = {};

    // Handle sound-based alerts
    if (sound === 1) {
      // Sound detected - set alerts to 1
      if (!isActiveFlag(notif['1_cough'])) toSet['1_cough'] = 1;
      if (!isActiveFlag(notif['2_tb'])) toSet['2_tb'] = 1;
      if (!isActiveFlag(notif['3_asthama'])) toSet['3_asthama'] = 1;
    } else if (sound === 0) {
      // No sound detected - clear alerts to 0
      if (isActiveFlag(notif['1_cough'])) toSet['1_cough'] = 0;
      if (isActiveFlag(notif['2_tb'])) toSet['2_tb'] = 0;
      if (isActiveFlag(notif['3_asthama'])) toSet['3_asthama'] = 0;
    }

    // "More than 120/80": either systolic > 120 OR diastolic > 80
    if ((Number.isFinite(sys) && sys > 120) || (Number.isFinite(dia) && dia > 80)) {
      if (!isActiveFlag(notif['4_hypertension'])) toSet['4_hypertension'] = 1;
    }

    // If nothing to update or currently writing, skip
    if (Object.keys(toSet).length === 0 || writingRef.current) return;

    // Skip if these exact keys were already written very recently (simple memory)
    const already = Object.entries(toSet).every(([k, v]) => lastWriteRef.current[k] === v);
    if (already) return;

    try {
      writingRef.current = true;
      await update(ref(database, `${nodePath}/2_Notification`), toSet);
      // Remember last written states
      lastWriteRef.current = { ...lastWriteRef.current, ...toSet };
      writingRef.current = false;
    } catch (e) {
      console.error('Failed to update notifications:', e);
      writingRef.current = false;
    }
  };

  const dismissAlert = (id) => setAlerts((prev) => prev.filter((a) => a.id !== id));

  const getAlertIcon = (type) => {
    switch (type) {
      case 'critical': return '!';
      case 'warning': return '!';
      case 'info': return 'i';
      default: return '*';
    }
  };

  const getVitalStatus = (value, type) => {
    if (value === null || value === undefined || value === "") return 'normal';
    const numValue = parseFloat(value);
    switch (type) {
      case 'temp':
        if (numValue > 38) return 'critical';
        if (numValue > 37.5) return 'warning';
        return 'normal';
      case 'hr':
        if (numValue > 100 || numValue < 60) return 'warning';
        return 'normal';
      case 'bp':
        if (numValue > 180) return 'critical';
        if (numValue > 140) return 'warning';
        return 'normal';
      case 'spo2':
        if (numValue < 90) return 'critical';
        if (numValue < 95) return 'warning';
        return 'normal';
      default:
        return 'normal';
    }
  };

  const getSensorValue = (sensorKey, defaultValue = 'N/A') => {
    const sensorData = patientData?.['1_Sensor_Data'];
    if (!sensorData) return defaultValue;
    const value = sensorData[sensorKey];
    if (value === null || value === undefined || value === "") return defaultValue;
    return value;
  };

  const getBloodPressureDisplay = () => {
    const sensorData = patientData?.['1_Sensor_Data'];
    if (!sensorData || !sensorData['5_bp']) {
      return { display: 'No Data', status: 'normal', statusText: 'No Data' };
    }
    const bpData = sensorData['5_bp'];
    let systolic = bpData['2_systolic'];
    let diastolic = bpData['1_diastolic'];
    if (systolic === null || systolic === undefined) systolic = "";
    if (diastolic === null || diastolic === undefined) diastolic = "";
    systolic = String(systolic).trim();
    diastolic = String(diastolic).trim();

    if ((systolic === "" || systolic === "null" || systolic === "undefined") &&
        (diastolic === "" || diastolic === "null" || diastolic === "undefined")) {
      return { display: 'Awaiting Data', status: 'normal', statusText: 'Pending' };
    }

    const sysDisplay = (systolic === "" || systolic === "null" || systolic === "undefined") ? "--" : systolic;
    const diaDisplay = (diastolic === "" || diastolic === "null" || diastolic === "undefined") ? "--" : diastolic;
    const displayText = `${sysDisplay}/${diaDisplay}`;

    let status = 'normal';
    let statusText = 'Normal';
    if (systolic && systolic !== "null" && systolic !== "undefined" && !isNaN(Number(systolic))) {
      const sysNum = Number(systolic);
      if (sysNum >= 180) { status = 'critical'; statusText = 'Critical'; }
      else if (sysNum >= 140) { status = 'warning'; statusText = 'High'; }
      else if (sysNum < 90) { status = 'warning'; statusText = 'Low'; }
    }
    return { display: displayText, status, statusText };
  };

  // Custom tooltip for charts
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div style={{
          backgroundColor: 'rgba(255, 255, 255, 0.95)',
          padding: '10px',
          border: '1px solid #ccc',
          borderRadius: '5px',
          boxShadow: '0 2px 5px rgba(0,0,0,0.1)'
        }}>
          <p style={{ margin: 0, fontWeight: 'bold' }}>{`Time: ${label}`}</p>
          {payload.map((entry, index) => (
            <p key={index} style={{ margin: '2px 0', color: entry.color }}>
              {`${entry.dataKey}: ${entry.value}${entry.dataKey === 'temperature' ? '°C' : 
                entry.dataKey === 'heartRate' ? ' BPM' : 
                entry.dataKey.includes('spo2') ? '%' : 
                entry.dataKey.includes('systolic') || entry.dataKey.includes('diastolic') ? ' mmHg' : 
                entry.dataKey === 'humidity' ? '%' : ''}`}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  if (!patientData && connectionStatus === 'connecting') {
    return (
      <div className="loading">
        <div className="loading-spinner"></div>
        <p>Loading patient data...</p>
      </div>
    );
  }

  if (connectionStatus === 'error') {
    return (
      <div className="error-screen">
        <div className="error-icon">X</div>
        <h2>Connection Error</h2>
        <p>Unable to connect to Firebase database. Please check your connection.</p>
      </div>
    );
  }

  const sensorData = patientData?.['1_Sensor_Data'] || {};
  const notificationData = patientData?.['2_Notification'] || {};
  const bpInfo = getBloodPressureDisplay();

  return (
    <div className="health-dashboard">
      <header className="health-dashboard-header">
        <h1>Health Monitoring Dashboard</h1>
      </header>

      {/* Alert Notifications (toasts) */}
      <div className={`alert-container ${showAlert ? 'show' : ''}`}>
        {alerts.map(alert => (
          <div key={alert.id} className={`alert alert-${alert.type}`}>
            <span className="alert-icon">{getAlertIcon(alert.type)}</span>
            <div className="alert-content">
              <div className="alert-message">{alert.message}</div>
              <div className="alert-time">{alert.timestamp}</div>
            </div>
            <button className="alert-dismiss" onClick={() => dismissAlert(alert.id)}>×</button>
          </div>
        ))}
      </div>

      <div className="health-dashboard-content">
        {/* Vital Signs Cards */}
        <div className="cards-grid">
          <div className="card">
            <div className="card-header"><h3>Temperature</h3><span className="card-icon">🌡️</span></div>
            <div className="card-value">{getSensorValue('3_temp')}°C</div>
            <div className={`card-status ${getVitalStatus(getSensorValue('3_temp', 0), 'temp')}`}>
              {getSensorValue('3_temp', 0) > 38 ? 'High' : getSensorValue('3_temp', 0) < 36 ? 'Low' : 'Normal'}
            </div>
          </div>

          <div className="card">
            <div className="card-header"><h3>Heart Rate</h3><span className="card-icon">💓</span></div>
            <div className="card-value">{getSensorValue('6_hr')} BPM</div>
            <div className={`card-status ${getVitalStatus(getSensorValue('6_hr', 0), 'hr')}`}>
              {getSensorValue('6_hr', 0) > 100 ? 'High' : getSensorValue('6_hr', 0) < 60 ? 'Low' : 'Normal'}
            </div>
          </div>

          {/* Blood Pressure */}
          <div className="card">
            <div className="card-header"><h3>Blood Pressure</h3><span className="card-icon">🩺</span></div>
            <div className="card-value">
              {bpInfo.display}
              {bpInfo.display !== 'No Data' && bpInfo.display !== 'Awaiting Data' && bpInfo.display !== '--/--' && !bpInfo.display.includes('--') ? ' mmHg' : ''}
            </div>
            <div className={`card-status ${bpInfo.status}`}>{bpInfo.statusText}</div>
          </div>

          <div className="card">
            <div className="card-header"><h3>SpO2</h3><span className="card-icon">🫁</span></div>
            <div className="card-value">{getSensorValue('7_spo2')}%</div>
            <div className={`card-status ${getVitalStatus(getSensorValue('7_spo2', 100), 'spo2')}`}>
              {getSensorValue('7_spo2', 100) < 95 ? 'Low' : 'Normal'}
            </div>
          </div>

          <div className="card">
            <div className="card-header"><h3>Humidity</h3><span className="card-icon">💧</span></div>
            <div className="card-value">{getSensorValue('4_hum')}%</div>
            <div className="card-status normal">
              {getSensorValue('4_hum', 0) > 80 ? 'High' : 'Normal'}
            </div>
          </div>

          <div className="card">
            <div className="card-header"><h3>Alcohol Level</h3><span className="card-icon">🍺</span></div>
            <div className="card-value">{getSensorValue('2_alcohol')}</div>
            <div className="card-status normal">
              {toNumber(getSensorValue('2_alcohol', 0)) > 0 ? 'Detected' : 'Normal'}
            </div>
          </div>

          <div className="card">
            <div className="card-header"><h3>CO₂ Level</h3><span className="card-icon">🌬️</span></div>
            <div className="card-value">{getSensorValue('1_co2') === true ? 'Detected' : 'Normal'}</div>
            <div className={`card-status ${getSensorValue('1_co2') === true ? 'warning' : 'normal'}`}>
              {getSensorValue('1_co2') === true ? 'High' : 'Normal'}
            </div>
          </div>

          <div className="card">
            <div className="card-header"><h3>Sound Level</h3><span className="card-icon">🔊</span></div>
            <div className="card-value">{getSensorValue('8_sound')}</div>
            <div className="card-status normal">Normal</div>
          </div>
        </div>

        {/* Charts Section */}
        {historicalData.length > 0 && (
          <div className="charts-section">
            <h2>Vital Signs Trends</h2>
            
            <div className="charts-grid">
              {/* Temperature Chart */}
              <div className="chart-container">
                <h3>Temperature Over Time</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={historicalData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="time" />
                    <YAxis domain={['dataMin - 1', 'dataMax + 1']} />
                    <Tooltip content={<CustomTooltip />} />
                    <Area 
                      type="monotone" 
                      dataKey="temperature" 
                      stroke="#ff6b6b" 
                      fill="#ff6b6b" 
                      fillOpacity={0.6}
                      connectNulls={false}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              {/* Heart Rate Chart */}
              <div className="chart-container">
                <h3>Heart Rate Over Time</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={historicalData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="time" />
                    <YAxis domain={['dataMin - 10', 'dataMax + 10']} />
                    <Tooltip content={<CustomTooltip />} />
                    <Line 
                      type="monotone" 
                      dataKey="heartRate" 
                      stroke="#4ecdc4" 
                      strokeWidth={3}
                      dot={{ fill: '#4ecdc4', strokeWidth: 2, r: 4 }}
                      connectNulls={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              {/* Blood Pressure Chart */}
              <div className="chart-container">
                <h3>Blood Pressure Over Time</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={historicalData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="time" />
                    <YAxis domain={['dataMin - 20', 'dataMax + 20']} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend />
                    <Line 
                      type="monotone" 
                      dataKey="systolic" 
                      stroke="#e74c3c" 
                      strokeWidth={2}
                      dot={{ fill: '#e74c3c', strokeWidth: 2, r: 3 }}
                      name="Systolic"
                      connectNulls={false}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="diastolic" 
                      stroke="#3498db" 
                      strokeWidth={2}
                      dot={{ fill: '#3498db', strokeWidth: 2, r: 3 }}
                      name="Diastolic"
                      connectNulls={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              {/* SpO2 Chart */}
              <div className="chart-container">
                <h3>SpO₂ Over Time</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={historicalData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="time" />
                    <YAxis domain={['dataMin - 5', 'dataMax + 2']} />
                    <Tooltip content={<CustomTooltip />} />
                    <Area 
                      type="monotone" 
                      dataKey="spo2" 
                      stroke="#9b59b6" 
                      fill="#9b59b6" 
                      fillOpacity={0.6}
                      connectNulls={false}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              {/* Sound Level Chart */}
              <div className="chart-container">
                <h3>Sound Level Over Time</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={historicalData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="time" />
                    <YAxis />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="soundLevel" fill="#f39c12" />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Environmental Factors */}
              <div className="chart-container">
                <h3>Environmental Factors</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={historicalData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="time" />
                    <YAxis />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend />
                    <Line 
                      type="monotone" 
                      dataKey="humidity" 
                      stroke="#27ae60" 
                      strokeWidth={2}
                      name="Humidity (%)"
                      connectNulls={false}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="co2" 
                      stroke="#e67e22" 
                      strokeWidth={2}
                      name="CO₂ Level"
                      connectNulls={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}

        {/* Notification Status */}
        <div className="notification-panel">
          <h3>Health Condition Alerts</h3>
          <div className="notification-grid">
            <div className={`notification-item ${isActiveFlag(notificationData['3_asthama']) ? 'active' : 'inactive'}`}>
              <span className="notification-icon">🫁</span>
              <span className="notification-label">Asthma</span>
              <span className={`notification-status ${isActiveFlag(notificationData['3_asthama']) ? 'alert' : 'normal'}`}>
                {isActiveFlag(notificationData['3_asthama']) ? 'ALERT' : 'Normal'}
              </span>
            </div>

            <div className={`notification-item ${isActiveFlag(notificationData['4_hypertension']) ? 'active' : 'inactive'}`}>
              <span className="notification-icon">💔</span>
              <span className="notification-label">Hypertension</span>
              <span className={`notification-status ${isActiveFlag(notificationData['4_hypertension']) ? 'alert' : 'normal'}`}>
                {isActiveFlag(notificationData['4_hypertension']) ? 'ALERT' : 'Normal'}
              </span>
            </div>

            <div className={`notification-item ${isActiveFlag(notificationData['1_cough']) ? 'active' : 'inactive'}`}>
              <span className="notification-icon">🤧</span>
              <span className="notification-label">Cough</span>
              <span className={`notification-status ${isActiveFlag(notificationData['1_cough']) ? 'alert' : 'normal'}`}>
                {isActiveFlag(notificationData['1_cough']) ? 'DETECTED' : 'Normal'}
              </span>
            </div>

            <div className={`notification-item ${isActiveFlag(notificationData['2_tb']) ? 'active' : 'inactive'}`}>
              <span className="notification-icon">🦠</span>
              <span className="notification-label">TB Risk</span>
              <span className={`notification-status ${isActiveFlag(notificationData['2_tb']) ? 'alert' : 'normal'}`}>
                {isActiveFlag(notificationData['2_tb']) ? 'ALERT' : 'Normal'}
              </span>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .charts-section {
          margin: 2rem 0;
          padding: 1.5rem;
          background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
          border-radius: 15px;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
        }
        
        .charts-section h2 {
          text-align: center;
          color: #2c3e50;
          margin-bottom: 2rem;
          font-size: 1.8rem;
          font-weight: bold;
        }
        
        .charts-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(500px, 1fr));
          gap: 2rem;
        }
        
        .chart-container {
          background: white;
          padding: 1.5rem;
          border-radius: 12px;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
          border: 1px solid #e1e8ed;
        }
        
        .chart-container h3 {
          margin: 0 0 1rem 0;
          color: #34495e;
          font-size: 1.2rem;
          font-weight: 600;
          text-align: center;
        }
        
        .loading {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 100vh;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
        }
        
        .loading-spinner {
          width: 50px;
          height: 50px;
          border: 4px solid rgba(255, 255, 255, 0.3);
          border-top: 4px solid white;
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin-bottom: 1rem;
        }
        
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        
        .error-screen {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 100vh;
          background: linear-gradient(135deg, #ff6b6b 0%, #ee5a24 100%);
          color: white;
          text-align: center;
        }
        
        .error-icon {
          font-size: 4rem;
          margin-bottom: 1rem;
        }
        
        .health-dashboard {
          min-height: 100vh;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          font-family: 'Arial', sans-serif;
        }
        
        .health-dashboard-header {
          background: rgba(255, 255, 255, 0.95);
          padding: 1.5rem;
          box-shadow: 0 2px 20px rgba(0, 0, 0, 0.1);
          backdrop-filter: blur(10px);
        }
        
        .health-dashboard-header h1 {
          margin: 0;
          color: #2c3e50;
          font-size: 2rem;
          font-weight: bold;
        }
        
        .patient-info {
          display: flex;
          justify-content: space-between;
          margin-top: 0.5rem;
          font-size: 0.9rem;
          color: #7f8c8d;
        }
        
        .health-dashboard-content {
          padding: 2rem;
        }
        
        .cards-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
          gap: 1.5rem;
          margin-bottom: 2rem;
        }
        
        .card {
          background: rgba(255, 255, 255, 0.95);
          padding: 1.5rem;
          border-radius: 15px;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
          backdrop-filter: blur(10px);
          border: 1px solid rgba(255, 255, 255, 0.2);
          transition: transform 0.3s ease, box-shadow 0.3s ease;
        }
        
        .card:hover {
          transform: translateY(-5px);
          box-shadow: 0 15px 40px rgba(0, 0, 0, 0.15);
        }
        
        .card-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1rem;
        }
        
        .card-header h3 {
          margin: 0;
          color: #34495e;
          font-size: 1.1rem;
        }
        
        .card-icon {
          font-size: 1.5rem;
        }
        
        .card-value {
          font-size: 2rem;
          font-weight: bold;
          color: #2c3e50;
          margin-bottom: 0.5rem;
        }
        
        .card-status {
          padding: 0.3rem 0.8rem;
          border-radius: 20px;
          font-size: 0.85rem;
          font-weight: 600;
          text-transform: uppercase;
        }
        
        .card-status.normal {
          background: #d5f4e6;
          color: #27ae60;
        }
        
        .card-status.warning {
          background: #fef9e7;
          color: #f39c12;
        }
        
        .card-status.critical {
          background: #fadbd8;
          color: #e74c3c;
        }
        
        .notification-panel {
          background: rgba(255, 255, 255, 0.95);
          padding: 1.5rem;
          border-radius: 15px;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
          backdrop-filter: blur(10px);
          margin-top: 2rem;
        }
        
        .notification-panel h3 {
          margin: 0 0 1.5rem 0;
          color: #2c3e50;
          font-size: 1.3rem;
        }
        
        .notification-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 1rem;
        }
        
        .notification-item {
          display: flex;
          align-items: center;
          padding: 1rem;
          border-radius: 10px;
          border: 2px solid #ecf0f1;
          transition: all 0.3s ease;
        }
        
        .notification-item.active {
          border-color: #e74c3c;
          background: #fadbd8;
        }
        
        .notification-item.inactive {
          border-color: #27ae60;
          background: #d5f4e6;
        }
        
        .notification-icon {
          font-size: 1.5rem;
          margin-right: 1rem;
        }
        
        .notification-label {
          flex: 1;
          font-weight: 600;
          color: #34495e;
        }
        
        .notification-status {
          padding: 0.3rem 0.8rem;
          border-radius: 15px;
          font-size: 0.8rem;
          font-weight: bold;
        }
        
        .notification-status.alert {
          background: #e74c3c;
          color: white;
        }
        
        .notification-status.normal {
          background: #27ae60;
          color: white;
        }
        
        .alert-container {
          position: fixed;
          top: 20px;
          right: 20px;
          z-index: 1000;
          opacity: 0;
          transform: translateX(100%);
          transition: all 0.3s ease;
        }
        
        .alert-container.show {
          opacity: 1;
          transform: translateX(0);
        }
        
        .alert {
          display: flex;
          align-items: center;
          margin-bottom: 0.5rem;
          padding: 1rem;
          border-radius: 8px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
          min-width: 300px;
          max-width: 400px;
        }
        
        .alert-critical {
          background: #fadbd8;
          border-left: 4px solid #e74c3c;
        }
        
        .alert-warning {
          background: #fef9e7;
          border-left: 4px solid #f39c12;
        }
        
        .alert-info {
          background: #d6eaf8;
          border-left: 4px solid #3498db;
        }
        
        .alert-icon {
          background: #e74c3c;
          color: white;
          width: 24px;
          height: 24px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: bold;
          margin-right: 1rem;
          font-size: 0.8rem;
        }
        
        .alert-content {
          flex: 1;
        }
        
        .alert-message {
          font-weight: 600;
          margin-bottom: 0.2rem;
        }
        
        .alert-time {
          font-size: 0.8rem;
          color: #7f8c8d;
        }
        
        .alert-dismiss {
          background: none;
          border: none;
          font-size: 1.2rem;
          cursor: pointer;
          color: #7f8c8d;
          padding: 0;
          margin-left: 0.5rem;
        }
        
        .alert-dismiss:hover {
          color: #2c3e50;
        }
        
        @media (max-width: 768px) {
          .health-dashboard-content {
            padding: 1rem;
          }
          
          .cards-grid, .charts-grid {
            grid-template-columns: 1fr;
          }
          
          .patient-info {
            flex-direction: column;
          }
          
          .alert-container {
            right: 10px;
            left: 10px;
          }
          
          .alert {
            min-width: auto;
          }
          
          .chart-container {
            min-width: 300px;
          }
        }
      `}</style>
    </div>
  );
};

export default Dashboard;