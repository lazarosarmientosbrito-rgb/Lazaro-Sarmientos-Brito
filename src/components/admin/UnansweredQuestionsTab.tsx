import React, { useState } from 'react';
import {
  HelpCircle,
  CheckCircle2,
  Clock,
  Plus,
  Search,
  MessageSquare,
  Sparkles,
  ArrowRight,
  User,
  Phone,
  Calendar,
  X,
  Trash2,
  Check,
} from 'lucide-react';
import { UnansweredQuestion, BusinessProject, FAQItem, AiKnowledgeItem } from '../../types';

export interface UnansweredQuestionsTabProps {
  project?: BusinessProject;
  questions?: UnansweredQuestion[];
  onUpdateUnansweredQuestions?: (questions: UnansweredQuestion[]) => void;
  onAddFaqOrKnowledge?: (faq?: FAQItem, knowledge?: AiKnowledgeItem) => void;
  onAnswerQuestion?: (id: string, answer: string, saveToFaq: boolean) => void;
  onDeleteQuestion?: (id: string) => void;
  onAddQuestion?: (question: UnansweredQuestion) => void;
}

export const UnansweredQuestionsTab: React.FC<UnansweredQuestionsTabProps> = ({
  project,
  questions: propQuestions,
  onUpdateUnansweredQuestions,
  onAddFaqOrKnowledge,
  onAnswerQuestion,
  onDeleteQuestion,
  onAddQuestion,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'pending' | 'answered'>('ALL');
  const [activeQuestionToAnswer, setActiveQuestionToAnswer] = useState<UnansweredQuestion | null>(null);
  const [adminAnswerText, setAdminAnswerText] = useState('');
  const [saveAsFaq, setSaveAsFaq] = useState(true);
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  const [manualQuestionText, setManualQuestionText] = useState('');
  const [manualCustomerName, setManualCustomerName] = useState('');

  const projectName = project?.name || 'Negocio Activo';
  const questions: UnansweredQuestion[] = propQuestions || project?.unansweredQuestions || [];

  const pendingCount = questions.filter((q) => q.status === 'pending').length;
  const answeredCount = questions.filter((q) => q.status === 'answered').length;

  const filteredQuestions = questions.filter((q) => {
    const matchesSearch =
      q.question.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (q.adminAnswer && q.adminAnswer.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (q.customerName && q.customerName.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesStatus = filterStatus === 'ALL' || q.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const handleOpenAnswerModal = (q: UnansweredQuestion) => {
    setActiveQuestionToAnswer(q);
    setAdminAnswerText(q.adminAnswer || '');
  };

  const handleSaveAnswer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeQuestionToAnswer || !adminAnswerText.trim()) return;

    const answer = adminAnswerText.trim();
    const qId = activeQuestionToAnswer.id;

    if (onAnswerQuestion) {
      onAnswerQuestion(qId, answer, saveAsFaq);
    } else {
      const updated = questions.map((q) =>
        q.id === qId
          ? {
              ...q,
              status: 'answered' as const,
              adminAnswer: answer,
              answeredAt: new Date().toISOString(),
            }
          : q
      );

      if (onUpdateUnansweredQuestions) {
        onUpdateUnansweredQuestions(updated);
      }

      // Also auto-add to Project FAQ / Knowledge so the AI learns immediately!
      if (saveAsFaq && onAddFaqOrKnowledge) {
        const newFaq: FAQItem = {
          id: `faq-learned-${Date.now()}`,
          category: 'Dúvidas Frequentes',
          question: activeQuestionToAnswer.question,
          answer: answer,
        };

        const newKnowledge: AiKnowledgeItem = {
          id: `kn-learned-${Date.now()}`,
          title: `Pregunta Aprendida: ${activeQuestionToAnswer.question.substring(0, 40)}...`,
          category: 'geral',
          content: `Pregunta del cliente: "${activeQuestionToAnswer.question}"\nRespuesta oficial: ${answer}`,
          createdAt: new Date().toISOString(),
        };

        onAddFaqOrKnowledge(newFaq, newKnowledge);
      }
    }

    setActiveQuestionToAnswer(null);
    setAdminAnswerText('');
  };

  const handleDeleteQuestion = (id: string) => {
    if (confirm('¿Deseas eliminar este registro de pregunta?')) {
      if (onDeleteQuestion) {
        onDeleteQuestion(id);
      } else if (onUpdateUnansweredQuestions) {
        const updated = questions.filter((q) => q.id !== id);
        onUpdateUnansweredQuestions(updated);
      }
    }
  };

  const handleAddManualQuestion = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualQuestionText.trim()) return;

    const newQ: UnansweredQuestion = {
      id: `unans-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      question: manualQuestionText.trim(),
      customerName: manualCustomerName.trim() || 'Cliente Manual',
      date: new Date().toISOString(),
      status: 'pending',
    };

    if (onAddQuestion) {
      onAddQuestion(newQ);
    } else if (onUpdateUnansweredQuestions) {
      onUpdateUnansweredQuestions([newQ, ...questions]);
    }
    setIsManualModalOpen(false);
    setManualQuestionText('');
    setManualCustomerName('');
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-amber-950 via-slate-900 to-indigo-950 rounded-3xl p-6 sm:p-7 text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1.5">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 text-xs font-bold border border-amber-400/30">
            <HelpCircle className="w-3.5 h-3.5" />
            <span>Aprendizaje Continuo • {projectName}</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2">
            ❓ Preguntas sin Respuesta ({pendingCount} pendientes)
          </h2>
          <p className="text-xs text-amber-100 max-w-2xl leading-relaxed">
            Cuando un cliente pregunta algo que la IA no conoce o no está en los datos de{' '}
            <strong>{projectName}</strong>, se registra aquí. Al escribir la respuesta, se agrega
            automáticamente a la base de conocimiento y FAQs para responder futuras consultas.
          </p>
        </div>

        <button
          onClick={() => setIsManualModalOpen(true)}
          className="px-5 py-3 rounded-2xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-extrabold shadow-lg shadow-amber-600/30 transition flex items-center space-x-2 shrink-0 border border-amber-400/30"
        >
          <Plus className="w-4 h-4" />
          <span>+ Registrar Pregunta</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar por pregunta, cliente o respuesta..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:border-amber-600 focus:ring-2 focus:ring-amber-100 outline-none text-xs text-slate-800 font-medium"
          />
        </div>

        <div className="flex items-center gap-1.5 text-xs">
          <button
            onClick={() => setFilterStatus('ALL')}
            className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition ${
              filterStatus === 'ALL'
                ? 'bg-slate-900 text-white shadow-sm'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Todas ({questions.length})
          </button>
          <button
            onClick={() => setFilterStatus('pending')}
            className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition flex items-center gap-1.5 ${
              filterStatus === 'pending'
                ? 'bg-amber-600 text-white shadow-sm'
                : 'bg-amber-50 text-amber-800 hover:bg-amber-100'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-amber-400"></span>
            <span>Pendientes ({pendingCount})</span>
          </button>
          <button
            onClick={() => setFilterStatus('answered')}
            className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition flex items-center gap-1.5 ${
              filterStatus === 'answered'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Respondidas ({answeredCount})</span>
          </button>
        </div>
      </div>

      {/* Questions List */}
      {filteredQuestions.length === 0 ? (
        <div className="bg-white rounded-3xl p-10 text-center border border-dashed border-slate-300 space-y-3">
          <div className="w-14 h-14 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto text-2xl">
            ✨
          </div>
          <h3 className="text-base font-bold text-slate-800">
            {searchTerm
              ? 'No se encontraron preguntas coincidentes'
              : '¡Todo al día! No hay preguntas pendientes'}
          </h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            La IA tiene toda la información necesaria para responder a los clientes de{' '}
            <strong>{projectName}</strong>.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredQuestions.map((q) => {
            const isPending = q.status === 'pending';

            return (
              <div
                key={q.id}
                className={`bg-white rounded-2xl p-5 border transition-all duration-200 shadow-sm ${
                  isPending
                    ? 'border-amber-300 ring-1 ring-amber-400/20 hover:shadow-md'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div className="space-y-2 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold flex items-center gap-1 ${
                          isPending
                            ? 'bg-amber-100 text-amber-900 border border-amber-300'
                            : 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                        }`}
                      >
                        {isPending ? (
                          <>
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                            Pendiente de Respuesta
                          </>
                        ) : (
                          <>
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            Respondida & Aprendida
                          </>
                        )}
                      </span>

                      {q.customerName && (
                        <span className="text-[11px] text-slate-500 font-semibold flex items-center gap-1">
                          <User className="w-3 h-3 text-slate-400" />
                          <span>{q.customerName}</span>
                        </span>
                      )}

                      {q.customerPhone && (
                        <span className="text-[11px] text-slate-500 font-semibold flex items-center gap-1">
                          <Phone className="w-3 h-3 text-slate-400" />
                          <span>{q.customerPhone}</span>
                        </span>
                      )}

                      <span className="text-[10px] text-slate-400 font-medium">
                        {new Date(q.date).toLocaleDateString()} {new Date(q.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>

                    <h4 className="font-extrabold text-slate-900 text-sm sm:text-base flex items-start gap-2">
                      <span className="text-amber-500 font-black">P:</span>
                      <span>"{q.question}"</span>
                    </h4>

                    {q.aiReplySnippet && (
                      <p className="text-xs text-slate-500 italic bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                        💬 Respuesta inicial de la IA: "{q.aiReplySnippet}"
                      </p>
                    )}

                    {q.adminAnswer && (
                      <div className="bg-emerald-50/70 border border-emerald-200 p-3 rounded-xl space-y-1">
                        <div className="flex items-center space-x-1.5 text-emerald-900 font-bold text-xs">
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Respuesta Oficial del Administrador:</span>
                        </div>
                        <p className="text-xs text-emerald-950 font-medium leading-relaxed">
                          {q.adminAnswer}
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="flex sm:flex-col items-center sm:items-end gap-2 shrink-0 pt-2 sm:pt-0">
                    <button
                      onClick={() => handleOpenAnswerModal(q)}
                      className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center space-x-1.5 shadow-sm ${
                        isPending
                          ? 'bg-amber-600 hover:bg-amber-700 text-white'
                          : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                      }`}
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>{isPending ? 'Responder & Enseñar a la IA' : 'Editar Respuesta'}</span>
                    </button>

                    <button
                      onClick={() => handleDeleteQuestion(q.id)}
                      className="p-2 rounded-xl text-slate-400 hover:text-red-600 hover:bg-red-50 transition"
                      title="Eliminar registro"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Answer Modal */}
      {activeQuestionToAnswer && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200">
            <div className="px-6 py-4 bg-gradient-to-r from-amber-950 to-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Sparkles className="w-5 h-5 text-amber-400" />
                <h3 className="font-black text-base text-white">Responder y Entrenar a la IA</h3>
              </div>
              <button
                onClick={() => setActiveQuestionToAnswer(null)}
                className="w-8 h-8 rounded-full bg-slate-800 text-slate-300 hover:text-white flex items-center justify-center transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveAnswer} className="p-6 space-y-4 text-xs text-slate-700">
              <div className="bg-amber-50 border border-amber-200 p-3.5 rounded-2xl space-y-1">
                <span className="font-extrabold text-amber-900 text-[11px] uppercase tracking-wider block">
                  Pregunta del Cliente:
                </span>
                <p className="font-bold text-slate-900 text-sm">
                  "{activeQuestionToAnswer.question}"
                </p>
              </div>

              <div>
                <label className="block font-bold text-slate-800 mb-1">
                  Escribe la respuesta correcta que la IA debe aprender *
                </label>
                <textarea
                  required
                  rows={4}
                  placeholder="Escribe claramente la respuesta que la IA usará para responder a este cliente y a los futuros..."
                  value={adminAnswerText}
                  onChange={(e) => setAdminAnswerText(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-300 focus:border-amber-600 outline-none leading-relaxed text-slate-900 font-medium text-xs"
                />
              </div>

              <div className="flex items-center space-x-2 p-3 bg-slate-50 rounded-xl border border-slate-200">
                <input
                  type="checkbox"
                  id="saveFaqCheck"
                  checked={saveAsFaq}
                  onChange={(e) => setSaveAsFaq(e.target.checked)}
                  className="w-4 h-4 text-blue-600 rounded"
                />
                <label htmlFor="saveFaqCheck" className="text-slate-700 font-semibold cursor-pointer">
                  Guardar automáticamente en la Base de Conocimiento y FAQs del proyecto
                </label>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setActiveQuestionToAnswer(null)}
                  className="px-4 py-2 rounded-xl font-bold text-slate-600 hover:bg-slate-100 transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl font-black text-white bg-gradient-to-r from-amber-600 to-indigo-600 hover:from-amber-500 hover:to-indigo-500 shadow-md transition flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>Guardar y Entrenar IA</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Manual Question Registration Modal */}
      {isManualModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200">
            <div className="px-6 py-4 bg-gradient-to-r from-slate-900 to-amber-950 text-white flex items-center justify-between">
              <h3 className="font-black text-base text-white flex items-center gap-2">
                <Plus className="w-4 h-4 text-amber-400" />
                <span>Registrar Nueva Pregunta</span>
              </h3>
              <button
                onClick={() => setIsManualModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-800 text-slate-300 hover:text-white flex items-center justify-center transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddManualQuestion} className="p-6 space-y-4 text-xs text-slate-700">
              <div>
                <label className="block font-bold text-slate-800 mb-1">
                  Pregunta a registrar *
                </label>
                <textarea
                  required
                  rows={3}
                  placeholder="¿Cuál es la pregunta frecuente o consulta del cliente?"
                  value={manualQuestionText}
                  onChange={(e) => setManualQuestionText(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-300 focus:border-amber-600 outline-none font-medium"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-800 mb-1">
                  Nombre del Cliente o Fuente (Opcional)
                </label>
                <input
                  type="text"
                  placeholder="Ej: Laura Gómez / WhatsApp"
                  value={manualCustomerName}
                  onChange={(e) => setManualCustomerName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:border-amber-600 outline-none"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsManualModalOpen(false)}
                  className="px-4 py-2 rounded-xl font-bold text-slate-600 hover:bg-slate-100 transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl font-black text-white bg-amber-600 hover:bg-amber-700 shadow-md transition"
                >
                  Registrar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
