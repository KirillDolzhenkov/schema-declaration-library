import './App.css'
import {ChangeEvent, useState} from "react";
import { PV } from "../utils";

function App() {
    const [inputValue, setInputValue] = useState<null | string>(null);
    const [errors, setErrors] = useState<null | string[]>(null);

    const promptSchema = PV.string()
        .min(8, 'Must be at least characters')
        .max(255, 'Must be at most characters')
        .regex(/[A-Z]/, 'A uppercase letter is required')
        .regex(/[a-z]/, 'A lowercase letter is required')
        .regex(/[0-9]/, 'A number is required')
        .regex(/[^A-Za-z0-9]/, 'A special character is required')
        .regex(/^[A-Za-z0-9!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]*$/, 'Use only Latin characters');

    const handleInputChange = (event: ChangeEvent<HTMLInputElement>) => {
        const newValue = event.target.value;

        if (!newValue.trim()) {
            setErrors(null);
            setInputValue(null);
            return;
        }

        const error = promptSchema.validateAll(newValue);
        setErrors(error.length > 0 ? [...error] : null);
        setInputValue(newValue);
    }

  return (
    <>
      <div className="card">
          <div>
              <input
                  type="text"
                  value={inputValue ?? void 0}
                  onChange={handleInputChange}
              />
              {errors && (
                  <ul style={{
                      color: 'red', marginTop: '5px', paddingLeft: '20px' }}>
                      {errors.map((error, index) => (
                          <li
                              style={{display: 'flex', flexDirection: 'row', alignItems: 'flex-start' }}
                              key={index}
                          >{error}</li>
                      ))}
                  </ul>
              )}
          </div>
      </div>
    </>
  )
}

export default App
