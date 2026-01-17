import { forwardRef, useEffect, useRef, useState } from 'react'
import { X, ChevronDown } from 'lucide-react'

// Button component
export const Button = forwardRef(({ 
  children, 
  variant = 'primary', 
  size = 'md',
  className = '',
  disabled = false,
  loading = false,
  ...props 
}, ref) => {
  const baseStyles = 'inline-flex items-center justify-center font-semibold rounded-xl transition-all duration-200 ease-out disabled:opacity-50 disabled:cursor-not-allowed'
  
  const variants = {
    primary: 'bg-primary-500 text-white hover:bg-primary-600 active:bg-primary-700 shadow-lg shadow-primary-500/25 hover:shadow-xl hover:shadow-primary-500/30',
    secondary: 'bg-white text-gray-700 border-2 border-gray-200 hover:border-primary-300 hover:text-primary-600',
    ghost: 'text-gray-600 hover:bg-gray-100 active:bg-gray-200',
    danger: 'bg-red-500 text-white hover:bg-red-600 active:bg-red-700',
    accent: 'bg-gradient-to-r from-primary-500 to-secondary-500 text-white hover:from-primary-600 hover:to-secondary-600 shadow-lg',
  }
  
  const sizes = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-5 py-2.5 text-base',
    lg: 'px-6 py-3 text-lg',
    xl: 'px-8 py-4 text-xl',
  }
  
  return (
    <button
      ref={ref}
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading && (
        <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
      )}
      {children}
    </button>
  )
})

Button.displayName = 'Button'

// Card component
export function Card({ children, className = '', hover = false, onClick = null }) {
  return (
    <div 
      className={`bg-white rounded-2xl shadow-sm border border-gray-100 ${hover ? 'hover:shadow-md hover:border-gray-200 hover:-translate-y-0.5 cursor-pointer' : ''} transition-all duration-200 ${className}`}
      onClick={onClick}
    >
      {children}
    </div>
  )
}

// Select component
export function Select({ 
  value, 
  onChange, 
  options, 
  placeholder = 'Select...', 
  className = '',
  label = '',
  disabled = false,
}) {
  const [open, setOpen] = useState(false)
  const containerRef = useRef(null)
  const selectedOption = options.find((option) => option.value === value)

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setOpen(false)
      }
    }

    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        setOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleEscape)

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [])

  const handleSelect = (nextValue) => {
    onChange(nextValue)
    setOpen(false)
  }

  return (
    <div className={className} ref={containerRef}>
      {label && <label className="block text-sm font-medium text-gray-700 mb-1.5">{label}</label>}
      <div className="relative">
        <button
          type="button"
          onClick={() => setOpen((prev) => !prev)}
          disabled={disabled}
          aria-haspopup="listbox"
          aria-expanded={open}
          className={`w-full px-4 py-3 bg-white border-2 border-gray-200 rounded-xl text-left focus:border-primary-400 focus:ring-4 focus:ring-primary-100 outline-none transition-all duration-200 flex items-center justify-between gap-2 ${open ? 'border-primary-400 ring-4 ring-primary-100' : ''} ${disabled ? 'opacity-60 cursor-not-allowed' : ''}`}
        >
          <span className={`truncate ${selectedOption ? 'text-gray-900' : 'text-gray-400'}`}>
            {selectedOption ? selectedOption.label : placeholder}
          </span>
          <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
        </button>

        {open && (
          <div
            role="listbox"
            className="absolute z-20 mt-2 w-full bg-white border border-gray-200 rounded-xl shadow-lg max-h-60 overflow-auto"
          >
            {options.map((option) => {
              const isSelected = option.value === value
              return (
                <button
                  key={option.value}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => handleSelect(option.value)}
                  className={`w-full px-4 py-2.5 text-left text-sm transition-colors ${isSelected ? 'bg-primary-50 text-primary-600 font-semibold' : 'text-gray-700 hover:bg-gray-50'}`}
                >
                  {option.label}
                </button>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

// Modal component
export function Modal({ isOpen, onClose, title, children, className = '' }) {
  if (!isOpen) return null
  
  return (
    <div 
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 animate-fade-in"
      onClick={onClose}
    >
      <div 
        className={`bg-white w-full sm:max-w-lg sm:rounded-2xl rounded-t-3xl max-h-[90vh] overflow-hidden animate-slide-up ${className}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          <button 
            onClick={onClose}
            className="p-2 rounded-full hover:bg-gray-100 transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>
        
        {/* Content */}
        <div className="overflow-y-auto max-h-[calc(90vh-60px)]">
          {children}
        </div>
      </div>
    </div>
  )
}

// Slider component
export function Slider({ 
  value, 
  onChange, 
  min = 1, 
  max = 5, 
  step = 1,
  label = '',
  showValue = true,
  valueLabels = null,
  className = '',
}) {
  return (
    <div className={className}>
      {label && (
        <div className="flex items-center justify-between mb-2">
          <label className="text-sm font-medium text-gray-700">{label}</label>
          {showValue && (
            <span className="text-sm font-semibold text-primary-600">
              {valueLabels ? valueLabels[value] : value}
            </span>
          )}
        </div>
      )}
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full h-2 bg-gray-200 rounded-full appearance-none cursor-pointer accent-primary-500"
      />
      {valueLabels && (
        <div className="flex justify-between mt-1">
          {Object.entries(valueLabels).map(([key, label]) => (
            <span key={key} className="text-xs text-gray-400">{label}</span>
          ))}
        </div>
      )}
    </div>
  )
}

// Badge component
export function Badge({ children, variant = 'primary', className = '' }) {
  const variants = {
    primary: 'bg-primary-100 text-primary-700',
    secondary: 'bg-secondary-100 text-secondary-700',
    accent: 'bg-accent-100 text-accent-700',
    gray: 'bg-gray-100 text-gray-700',
    success: 'bg-emerald-100 text-emerald-700',
  }
  
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${variants[variant]} ${className}`}>
      {children}
    </span>
  )
}

// Loading spinner
export function Spinner({ size = 'md', className = '' }) {
  const sizes = {
    sm: 'w-4 h-4 border-2',
    md: 'w-8 h-8 border-4',
    lg: 'w-12 h-12 border-4',
  }
  
  return (
    <div className={`${sizes[size]} border-primary-200 border-t-primary-500 rounded-full animate-spin ${className}`} />
  )
}

// Loading dots
export function LoadingDots({ className = '' }) {
  return (
    <div className={`flex items-center gap-1 ${className}`}>
      <div className="loading-dot" />
      <div className="loading-dot" />
      <div className="loading-dot" />
    </div>
  )
}

// Icon button
export function IconButton({ 
  icon: Icon, 
  onClick, 
  className = '', 
  size = 'md',
  variant = 'default',
  disabled = false,
  ...props 
}) {
  const sizes = {
    sm: 'p-2',
    md: 'p-3',
    lg: 'p-4',
  }
  
  const iconSizes = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6',
  }
  
  const variants = {
    default: 'bg-white shadow-md hover:shadow-lg text-gray-700',
    primary: 'bg-primary-500 text-white hover:bg-primary-600',
    ghost: 'bg-transparent hover:bg-gray-100 text-gray-600',
  }
  
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`${sizes[size]} rounded-full ${variants[variant]} hover:scale-105 active:scale-95 transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
      {...props}
    >
      <Icon className={iconSizes[size]} />
    </button>
  )
}

// Text input
export function Input({ 
  value, 
  onChange, 
  placeholder = '', 
  label = '',
  type = 'text',
  className = '',
  inputClassName = '',
  endAdornment = null,
  ...props 
}) {
  const basePaddingRight = endAdornment ? 'pr-16' : ''

  return (
    <div className={className}>
      {label && <label className="block text-sm font-medium text-gray-700 mb-1.5">{label}</label>}
      <div className="relative">
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={`w-full px-4 py-3 ${basePaddingRight} bg-white border-2 border-gray-200 rounded-xl focus:border-primary-400 focus:ring-4 focus:ring-primary-100 outline-none transition-all duration-200 placeholder:text-gray-400 ${inputClassName}`}
          {...props}
        />
        {endAdornment && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            {endAdornment}
          </div>
        )}
      </div>
    </div>
  )
}

// Textarea
export function Textarea({ 
  value, 
  onChange, 
  placeholder = '', 
  label = '',
  rows = 3,
  className = '',
  ...props 
}) {
  return (
    <div className={className}>
      {label && <label className="block text-sm font-medium text-gray-700 mb-1.5">{label}</label>}
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        className="w-full px-4 py-3 bg-white border-2 border-gray-200 rounded-xl focus:border-primary-400 focus:ring-4 focus:ring-primary-100 outline-none transition-all duration-200 placeholder:text-gray-400 resize-none"
        {...props}
      />
    </div>
  )
}

export default {
  Button,
  Card,
  Select,
  Modal,
  Slider,
  Badge,
  Spinner,
  LoadingDots,
  IconButton,
  Input,
  Textarea,
}
