import React, { useState } from 'react';
import { 
  Users, 
  Plus, 
  ShieldCheck, 
  UserCheck, 
  Trash2, 
  Edit2, 
  Phone, 
  Mail, 
  CheckCircle2, 
  XCircle,
  Briefcase
} from 'lucide-react';
import { Employee, BusinessProject } from '../../types';

interface EmployeesTabProps {
  project: BusinessProject;
  onUpdateEmployees: (employees: Employee[]) => void;
}

export const EmployeesTab: React.FC<EmployeesTabProps> = ({
  project,
  onUpdateEmployees,
}) => {
  const employees = project.employees || [];
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [position, setPosition] = useState('');
  const [role, setRole] = useState<'ADMINISTRADOR' | 'GERENTE' | 'EMPLEADO'>('EMPLEADO');
  const [status, setStatus] = useState<'ativo' | 'inativo'>('ativo');

  const handleOpenAdd = () => {
    setEditingEmployee(null);
    setName('');
    setPhone('');
    setEmail('');
    setPosition('');
    setRole('EMPLEADO');
    setStatus('ativo');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (emp: Employee) => {
    setEditingEmployee(emp);
    setName(emp.name);
    setPhone(emp.phone || '');
    setEmail(emp.email || '');
    setPosition(emp.position || '');
    setRole(emp.role);
    setStatus(emp.status);
    setIsModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    if (editingEmployee) {
      const updated = employees.map((e) =>
        e.id === editingEmployee.id
          ? { ...e, name, phone, email, position, role, status }
          : e
      );
      onUpdateEmployees(updated);
    } else {
      const newEmp: Employee = {
        id: 'emp-' + Date.now(),
        name,
        phone,
        email,
        position,
        role,
        status,
        createdAt: new Date().toISOString(),
      };
      onUpdateEmployees([...employees, newEmp]);
    }
    setIsModalOpen(false);
  };

  const handleDelete = (id: string) => {
    if (confirm('¿Seguro que deseas eliminar este empleado de la empresa?')) {
      onUpdateEmployees(employees.filter((e) => e.id !== id));
    }
  };

  const getRoleBadge = (r: Employee['role']) => {
    switch (r) {
      case 'ADMINISTRADOR':
        return <span className="px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-800 text-xs font-black border border-purple-300">ADMINISTRADOR</span>;
      case 'GERENTE':
        return <span className="px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800 text-xs font-black border border-blue-300">GERENTE</span>;
      default:
        return <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-800 text-xs font-bold">EMPLEADO</span>;
    }
  };

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* Top Header */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-blue-600 font-bold text-xs uppercase tracking-wider mb-1">
            <Users className="w-4 h-4" />
            <span>Gestión de Equipo & Permisos</span>
          </div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">
            Empleados de {project.name}
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Administra los usuarios autorizados para operar esta empresa. Acceso estrictamente aislado por negocio.
          </p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="px-4 py-2.5 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md shadow-blue-600/20 transition flex items-center space-x-2 shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>+ Agregar Empleado</span>
        </button>
      </div>

      {/* Permissions Guide Info Box */}
      <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
        <div className="p-3 bg-white rounded-xl border border-slate-200/80">
          <span className="font-extrabold text-purple-700 block mb-1">👑 ADMINISTRADOR</span>
          <p className="text-slate-500 text-[11px] leading-relaxed">
            Acceso completo a productos, pedidos, configuración de empresa, WhatsApp, IA y empleados.
          </p>
        </div>
        <div className="p-3 bg-white rounded-xl border border-slate-200/80">
          <span className="font-extrabold text-blue-700 block mb-1">👔 GERENTE</span>
          <p className="text-slate-500 text-[11px] leading-relaxed">
            Gestión de catálogo, precios, stock, pedidos de clientes, estadísticas y agendamientos.
          </p>
        </div>
        <div className="p-3 bg-white rounded-xl border border-slate-200/80">
          <span className="font-extrabold text-slate-700 block mb-1">💼 EMPLEADO</span>
          <p className="text-slate-500 text-[11px] leading-relaxed">
            Visualización de pedidos, atención de clientes transferidos por la IA y registro de entregas.
          </p>
        </div>
      </div>

      {/* Employees List */}
      {employees.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-dashed border-slate-300 space-y-3">
          <div className="w-16 h-16 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mx-auto text-2xl">
            👥
          </div>
          <h3 className="text-lg font-bold text-slate-800">Sin empleados registrados</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Puedes invitar y registrar a tus colaboradores asignándoles un rol específico de acceso a esta empresa.
          </p>
          <button
            onClick={handleOpenAdd}
            className="px-4 py-2 rounded-xl bg-blue-600 text-white font-bold text-xs shadow"
          >
            + Agregar Primer Empleado
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {employees.map((emp) => (
            <div
              key={emp.id}
              className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm hover:shadow-md transition flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-slate-100 to-slate-200 border border-slate-200 flex items-center justify-center text-xl font-black text-slate-700">
                      {emp.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h4 className="font-black text-slate-900 text-sm">{emp.name}</h4>
                      <p className="text-xs text-slate-500 font-medium">{emp.position || 'Colaborador'}</p>
                    </div>
                  </div>
                  {getRoleBadge(emp.role)}
                </div>

                <div className="space-y-1.5 text-xs text-slate-600 bg-slate-50 p-3 rounded-2xl mb-4">
                  {emp.phone && (
                    <div className="flex items-center space-x-2">
                      <Phone className="w-3.5 h-3.5 text-slate-400" />
                      <span>{emp.phone}</span>
                    </div>
                  )}
                  {emp.email && (
                    <div className="flex items-center space-x-2">
                      <Mail className="w-3.5 h-3.5 text-slate-400" />
                      <span className="truncate">{emp.email}</span>
                    </div>
                  )}
                  <div className="flex items-center space-x-2 pt-0.5">
                    <span className={`w-2 h-2 rounded-full ${emp.status === 'ativo' ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                    <span className="font-bold text-[11px] uppercase">
                      {emp.status === 'ativo' ? 'Activo' : 'Inactivo'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end space-x-2">
                <button
                  onClick={() => handleOpenEdit(emp)}
                  className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition flex items-center space-x-1"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  <span>Editar</span>
                </button>
                <button
                  onClick={() => handleDelete(emp.id)}
                  className="px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs transition flex items-center space-x-1"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Eliminar</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add / Edit Employee Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
          <form
            onSubmit={handleSave}
            className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-black text-slate-900 text-base">
                {editingEmployee ? 'Editar Empleado' : 'Nuevo Empleado'}
              </h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center font-black"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Nombre Completo *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ej: Carlos Silva"
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 outline-none focus:bg-white focus:border-blue-600 font-medium"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Cargo / Puesto</label>
                <input
                  type="text"
                  value={position}
                  onChange={(e) => setPosition(e.target.value)}
                  placeholder="Ej: Encargado de Ventas, Repartidor..."
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 outline-none focus:bg-white focus:border-blue-600 font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Teléfono</label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+55 11 99999-9999"
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 outline-none focus:bg-white focus:border-blue-600 font-medium"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="carlos@empresa.com"
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 outline-none focus:bg-white focus:border-blue-600 font-medium"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Rol / Permisos</label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 outline-none focus:bg-white font-bold text-slate-800"
                  >
                    <option value="EMPLEADO">EMPLEADO</option>
                    <option value="GERENTE">GERENTE</option>
                    <option value="ADMINISTRADOR">ADMINISTRADOR</option>
                  </select>
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Estado</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 outline-none focus:bg-white font-bold text-slate-800"
                  >
                    <option value="ativo">Activo</option>
                    <option value="inativo">Inactivo</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="pt-3 flex justify-end space-x-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 font-bold text-xs"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow transition"
              >
                Guardar Empleado
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
