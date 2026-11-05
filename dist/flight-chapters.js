const stage = (id,short,title,camera,page,intent) => ({id,short,title,camera,page,intent});
export const chapters = [
  stage('integration','Integration','Will the payload fit?', 'launch','launch','Inspect the folded spacecraft on its adapter and measure clearance against the selected payload envelope.'),
  stage('pad','On the pad','The stack is ready for launch', 'launch','launch','See the integrated launch vehicle on its pad before liftoff.'),
  stage('ascent','Ascent','Ride the launch vehicle', 'launch','launch','Watch the illustrative ascent and the change in altitude before spacecraft separation.'),
  stage('insertion','Insertion','Separate from the upper stage', 'launch','orbit','Follow orbital insertion and upper-stage separation. The spacecraft trims its orbit after the appendages lock.'),
  stage('commissioning','Deploy spacecraft','Deploy the wings and radiators', 'spacecraft','power','Follow the wing tip drums and hinged radiator panels, then verify coolant admission and Sun acquisition.'),
  stage('operations','Computing','Run the orbital data center', 'core','thermal','Look inside the thermal enclosure as processors send heat through the coolant loop.'),
  stage('contact','Ground pass','Bring the data back to Earth', 'spacecraft','comm','Observe contact acquisition, terminal power and payload leaving the recorder.'),
  stage('reboost','Reboost','Replace the momentum lost to drag', 'spacecraft','prop','Watch a chemical orbit-maintenance burn and read the tank ledger.'),
  stage('desat','CMG unload','Unload the pointing system', 'spacecraft','attitude','Watch the magnetic torquers exchange angular momentum with Earth’s field.'),
  stage('deorbit','Disposal','Execute mission disposal', 'orbit','prop','Inspect the selected retirement maneuver, achieved trajectory and terminal conditions.'),
];
