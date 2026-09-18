import { Router } from 'express';
import {
  listarCategorias,
  obtenerCategoria,
  crearCategoria,
  actualizarCategoria,
  eliminarCategoria,
  listarProductos,
  obtenerProducto,
  crearProducto,
  actualizarProducto,
  eliminarProducto,
  listarCarrito,
  obtenerCarritoItem,
  crearCarritoItem,
  actualizarCarritoItem,
  eliminarCarritoItem,
  vaciarCarrito,
  listarPedidos,
  obtenerPedido,
  crearPedido,
  actualizarPedido,
  eliminarPedido
} from '../controllers/controller.catalogo.js';
import { verificarAdmin, verificarToken } from '../middleware/auth.middleware.js';

const router = Router();

router.get('/categorias', listarCategorias);
router.get('/categorias/:id', obtenerCategoria);
router.post('/categorias', verificarToken, verificarAdmin, crearCategoria);
router.put('/categorias/:id', verificarToken, verificarAdmin, actualizarCategoria);
router.delete('/categorias/:id', verificarToken, verificarAdmin, eliminarCategoria);

router.get('/productos', listarProductos);
router.get('/productos/:id', obtenerProducto);
router.post('/productos', verificarToken, verificarAdmin, crearProducto);
router.put('/productos/:id', verificarToken, verificarAdmin, actualizarProducto);
router.delete('/productos/:id', verificarToken, verificarAdmin, eliminarProducto);

router.get('/carrito', listarCarrito);
router.get('/carrito/:id', obtenerCarritoItem);
router.post('/carrito', crearCarritoItem);
router.put('/carrito/:id', actualizarCarritoItem);
router.delete('/carrito/:id', eliminarCarritoItem);
router.delete('/carrito', vaciarCarrito);

router.get('/pedidos', listarPedidos);
router.get('/pedidos/:id', obtenerPedido);
router.post('/pedidos', crearPedido);
router.put('/pedidos/:id', verificarToken, verificarAdmin, actualizarPedido);
router.delete('/pedidos/:id', verificarToken, verificarAdmin, eliminarPedido);

export default router;
