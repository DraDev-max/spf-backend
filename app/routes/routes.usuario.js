import { Router } from 'express';
import {
  listarUsuarios,
  obtenerUsuario,
  crearUsuario,
  actualizarUsuario,
  eliminarUsuario
} from '../controllers/controller.usuario.js';
import { verificarAdmin, verificarToken } from '../middleware/auth.middleware.js';

const router = Router();

router.get('/usuarios', verificarToken, verificarAdmin, listarUsuarios);
router.get('/usuarios/:id', verificarToken, verificarAdmin, obtenerUsuario);
router.post('/usuarios', verificarToken, verificarAdmin, crearUsuario);
router.put('/usuarios/:id', verificarToken, verificarAdmin, actualizarUsuario);
router.delete('/usuarios/:id', verificarToken, verificarAdmin, eliminarUsuario);

export default router;
