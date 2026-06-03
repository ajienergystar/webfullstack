import { Navigate } from 'react-router-dom'
import { getToken } from '../api/auth'

export default function ProtectedRoute({ children }) {
  if (!getToken()) {
    return <Navigate to="/signin" replace />
  }
  return children
}
