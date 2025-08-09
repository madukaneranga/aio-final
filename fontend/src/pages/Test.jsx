import React, { useRef } from 'react';

function UncontrolledInput() {
  const inputRef = useRef(null);

  const handleClick = () => {
    alert(`Input value is: ${inputRef.current.value}`);
  };

  return (
    <>
      <input type="text" ref={inputRef} placeholder="Uncontrolled input" />
      <button onClick={handleClick}>Show Value</button>
    </>
  );
}

export default UncontrolledInput;
