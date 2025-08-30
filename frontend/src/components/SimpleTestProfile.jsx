import React from 'react';

const SimpleTestProfile = () => {
  console.log("🔍 SimpleTestProfile: Component is rendering");
  
  return (
    <div style={{ padding: '20px', backgroundColor: 'lightblue', margin: '20px' }}>
      <h1>Simple Test Profile</h1>
      <p>This is a simple test component</p>
      <p>Time: {new Date().toLocaleTimeString()}</p>
    </div>
  );
};

export default SimpleTestProfile;
