import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Truck, 
  Scale, 
  ClipboardCheck, 
  Camera, 
  CreditCard, 
  CheckCircle2, 
  ChevronRight, 
  ChevronLeft 
} from 'lucide-react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { CameraModal } from '../ui/CameraModal';

const steps = [
  { id: 1, name: 'Vehicle & Supplier', icon: Truck },
  { id: 2, name: 'Gross Weight', icon: Scale },
  { id: 3, name: 'Grading', icon: ClipboardCheck },
  { id: 4, name: 'Compliance Photos', icon: Camera },
  { id: 5, name: 'Tare & Payment', icon: CreditCard },
  { id: 6, name: 'Complete', icon: CheckCircle2 },
];

export const TicketWizard = () => {
  const [currentStep, setCurrentStep] = useState(1);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [capturedPhotos, setCapturedPhotos] = useState([]);

  const nextStep = () => setCurrentStep(prev => Math.min(prev + 1, steps.length));
  const prevStep = () => setCurrentStep(prev => Math.max(prev - 1, 1));

  return (
    <div className="max-w-4xl mx-auto py-8">
      {/* Step Indicator */}
      <div className="flex justify-between mb-12">
        {steps.map((step) => (
          <div key={step.id} className="flex flex-col items-center relative flex-1">
            <div className={`
              w-12 h-12 rounded-2xl flex items-center justify-center z-10 transition-all duration-500
              ${currentStep >= step.id ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-200' : 'bg-white text-gray-400 border border-gray-100'}
            `}>
              <step.icon size={22} />
            </div>
            {step.id !== steps.length && (
              <div className={`
                absolute top-6 left-1/2 w-full h-[2px] -translate-y-1/2 transition-colors duration-500
                ${currentStep > step.id ? 'bg-emerald-600' : 'bg-gray-100'}
              `} />
            )}
            <span className={`text-[10px] font-bold uppercase tracking-widest mt-3 ${currentStep >= step.id ? 'text-emerald-700' : 'text-gray-400'}`}>
              {step.name}
            </span>
          </div>
        ))}
      </div>

      {/* Step Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentStep}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.4 }}
        >
          <Card className="p-10 shadow-xl border-gray-100">
            {currentStep === 1 && (
              <div className="space-y-8">
                <div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">Vehicle & Supplier</h3>
                  <p className="text-gray-500">Capture the vehicle registration and select the supplier.</p>
                </div>
                <div className="grid grid-cols-2 gap-6">
                  <Input label="Vehicle Registration" placeholder="ABC 123 GP" />
                  <Input label="Trailer Registration (Optional)" placeholder="XYZ 789 GP" />
                  <div className="col-span-2">
                    <Input label="Select Supplier" placeholder="Search by name or ID number..." />
                  </div>
                </div>
              </div>
            )}

            {currentStep === 2 && (
              <div className="space-y-8">
                <div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">Record Gross Weight</h3>
                  <p className="text-gray-500">Ensure the vehicle is fully on the weighbridge.</p>
                </div>
                <div className="flex items-center justify-center p-12 bg-gray-50 rounded-3xl border-2 border-dashed border-gray-200">
                  <div className="text-center">
                    <span className="text-6xl font-black text-gray-900 tabular-nums tracking-tighter">12,450</span>
                    <span className="text-2xl font-bold text-gray-400 ml-3">kg</span>
                    <p className="text-emerald-600 font-bold mt-4 flex items-center justify-center">
                      <Scale size={18} className="mr-2" /> Live Scale reading
                    </p>
                  </div>
                </div>
              </div>
            )}

            {currentStep === 4 && (
              <div className="space-y-8">
                <div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">Compliance Photos</h3>
                  <p className="text-gray-500 text-sm">SAPS requires 3 mandatory photos for this ticket.</p>
                </div>
                <div className="grid grid-cols-3 gap-6">
                  {['Seller Face', 'Material Load', 'ID Document'].map((type) => (
                    <button 
                      key={type}
                      onClick={() => setIsCameraOpen(true)}
                      className="aspect-square rounded-3xl border-2 border-dashed border-gray-200 hover:border-emerald-500 hover:bg-emerald-50 transition-all flex flex-col items-center justify-center bg-gray-50 group"
                    >
                      <Camera className="text-gray-400 group-hover:text-emerald-600 transition-colors" size={32} />
                      <span className="text-xs font-bold mt-3 text-gray-500 group-hover:text-emerald-700">{type}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Default Placeholder for other steps */}
            {![1, 2, 4].includes(currentStep) && (
              <div className="py-20 text-center">
                <p className="text-gray-400 font-medium italic">Step {currentStep} Content (In Development)</p>
              </div>
            )}

            <div className="flex justify-between mt-12 pt-8 border-t border-gray-100">
              <Button variant="secondary" onClick={prevStep} disabled={currentStep === 1} className="flex items-center">
                <ChevronLeft className="mr-2" size={20} /> Back
              </Button>
              <Button onClick={nextStep} className="flex items-center px-8">
                {currentStep === steps.length ? 'Finalize Ticket' : 'Continue'} 
                <ChevronRight className="ml-2" size={20} />
              </Button>
            </div>
          </Card>
        </motion.div>
      </AnimatePresence>

      <CameraModal 
        isOpen={isCameraOpen} 
        onClose={() => setIsCameraOpen(false)} 
        onCapture={(photo) => {
          setCapturedPhotos([...capturedPhotos, photo]);
          setIsCameraOpen(false);
        }}
      />
    </div>
  );
};
