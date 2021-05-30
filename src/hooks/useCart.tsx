import { createContext, ReactNode, useContext, useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { Product, Stock } from '../types';

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem('@RocketShoes:cart');

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  const addProduct = async (productId: number) => {
    try {
      const apiProduct = await api.get(`/products/${productId}`).then(response => response.data)

      if(!apiProduct){
        throw new Error("Produto não encontrado")
      }

      const product = {
        id: apiProduct.id,
        title: apiProduct.title,
        price: apiProduct.price,
        image: apiProduct.image,
        amount: 1
      }

      const existingProduct = cart.find(product => product.id === productId)

      if(existingProduct){
        product.amount += existingProduct.amount
      }

      const productInStock = await api.get(`/stock/${productId}`).then(response => response.data)
      if(product.amount > productInStock.amount) {
        toast.error('Quantidade solicitada fora de estoque');
        return
      }

      const cartWithoutProduct = cart.filter(product => product.id !== productId)

      const newCart = [...cartWithoutProduct, product]

      setCart(newCart)
      attLocalStorage(newCart)
    } catch {
      toast.error('Erro na adição do produto');
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const product = cart.find(product => product.id === productId)
      if(!product){
        throw new Error('Produto não existe')
      }
      const cartWithoutProduct = cart.filter(product => product.id !== productId)

      setCart(cartWithoutProduct)
      attLocalStorage(cartWithoutProduct)
    } catch {
      toast.error('Erro na remoção do produto');
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      if(amount < 1){
        return
      }

      const productInStock = await api.get(`/stock/${productId}`).then(response => response.data)
      if(amount > productInStock.amount) {
        toast.error('Quantidade solicitada fora de estoque');
        return
      }

      const product = cart.find(product => product.id === productId)

      if(!product){
        return;
      }

      product.amount = amount

      const cartWithoutProduct = cart.filter(product => product.id !== productId)

      const newCart = [...cartWithoutProduct, product]

      setCart(newCart)
      attLocalStorage(newCart)
    } catch {
      toast.error('Erro na alteração de quantidade do produto');
    }
  };
  
  function attLocalStorage(c: Product[]){
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(c))
  }

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
