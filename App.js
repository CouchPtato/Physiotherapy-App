// import React from 'react';
// import { View, Text } from 'react-native';

// export default function App() {
//   return (
//     <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
//       <Text>Exercise Tracker</Text>
//     </View>
//   );
// }

import React from 'react';
import {View, Text} from 'react-native';
import {Camera} from 'expo-camera';

export default function App() {
  const [permission, requestPermission] = Camera.useCameraPermissions();
  const [isTracking, setIsTracking] = useState(false);
  const [data, setData] = useState({ angle: 0, stage: "-", counter: 0, form: "-" });

  const cameraRef = useRef(null);
  const ws = useRef(null);
  const timer = useRef(null);

  const server_url = "ws://192.168.1.9:8000/ws/track";
}