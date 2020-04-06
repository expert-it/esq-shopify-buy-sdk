/* 
  This is a private plugin for Esqido. 
  Author: Mathew Chan. 
  All Rights Reserved. 
*/
import 'arrive'

// Define variables
let initCount = 0
let itemCount = 0
let lsCheckoutId = 'esq_eyeliner_checkout_id'
let lsCartId = 'esq_eyeliner_cart'
let cartOpen = false
let modalOpen = false
let client
let clientSettings

  // Begin Plugin
;(function ($) {
  $.fn.plugin = async function (options) {
    const self = this
    clientSettings = $.extend(
      {
        domain: 'esqido.com',
        storefrontAccessToken: '05f86644045cc5fc6cc10718814e3f31',
        productHandle: 'gel-liner-pencil',
        defaultOption: '2-Pack',
        defaultCurrency: 'USD',
        defaultRegion: 'en-US',
      },
      options
    )
    const setup = async function () {
      createClient()
      await fetchProduct(self, clientSettings.productHandle)
    }
    const initPlugin = async function () {
      createContainer()
      createProduct()
      setDefaultOption()
      setDefaultColor()
      setSelectedText()
      createCart()
      await createCartAndCheckoutId()
      createCartItems()
      attachListeners()
      initCount++
    }
    const createClient = function () {
      const { domain, storefrontAccessToken } = clientSettings
      client = ShopifyBuy.buildClient({
        domain,
        storefrontAccessToken,
      })
    }
    const createContainer = function () {
      $('.productSpinner').hide()
      // If the product has options (not a single variant which only has an option of "Title")
      const productOptions = self.data('productOptions')
      if (productOptions) {
        self.append(`
          <div class="productOptions"></div>
          <div class="addToCartWrapper">
            <div class="quantity">
              <button class="quantity-button quantity-down">-</button>
                <input class="qtySelector" type="number" value="1" min="1" />
              <button class="quantity-button quantity-up">+</button>
            </div>
            <button class="btn addToCart">
              <img class="spinner" src="https://cdn.shopify.com/s/files/1/0250/1519/files/spinner.svg?v=1585762796" alt="Loading Checkout" />
              <span class="addToCartText">Add To Cart</span>
            </button>
          </div>
        `)
      } else {
        const singleVariant = self.data('singleVariant')
        createPrices(singleVariant, self)
        self.append(`
          <span class="addToCartWrapper">
            <div class="quantity">
              <button class="quantity-button quantity-down">-</button>
                <input class="qtySelector" type="number" value="1" min="1" />
              <button class="quantity-button quantity-up">+</button>
            </div>
            <button class="btn addToCart">
              <img class="spinner" src="https://cdn.shopify.com/s/files/1/0250/1519/files/spinner.svg?v=1585762796" alt="Loading Checkout" />
              <span class="addToCartText">Add To Cart</span>
            </button>
          </div>
        `)
      }
    }
    // Only render product options if the product has options or colors
    const createProduct = function () {
      const productOptions = self.data('productOptions')
      const colorOptions = self.data('colorOptions')
      if (productOptions) {
        createOptions()
      }
      if (colorOptions) {
        createColors(clientSettings.defaultOption)
      }
    }
    // Render unit options
    const createOptions = function () {
      const optionsAndVariants = self.data('optionsAndVariants')
      if (optionsAndVariants) {
        $.each(optionsAndVariants, function (
          productOptionIndex,
          productOption
        ) {
          const container = self.find('.productOptions')
          const id = self.attr('id')
          const firstVariant = productOption.variants[0]
          // First create the label and input for each product option
          $(container).append(`
            <label class="unit-option-label ${
              !firstVariant.available ? 'unavailable' : ''
            }">
              <input class="unit-option" type="radio" name="unit-option-${id}" value='${
            firstVariant.id
          }' data-value='${productOption.name}' ${
            !firstVariant.available ? 'disabled' : ''
          }/>
              ${productOption.name}
            </label>
          `)
          // Get the price of any variant within that product option
          const pricesContainer = container.find('.unit-option-label')[
            productOptionIndex
          ]
          createPrices(firstVariant, pricesContainer, clientSettings)
        })
      }
    }
    const createColors = function (productOption) {
      const optionsAndVariants = self.data('optionsAndVariants')
      const colorOptions = self.data('colorOptions')
      // Only render color swatches if it has color variants
      if (colorOptions && productOption) {
        // Find the variants for the matching option
        const variants = optionsAndVariants.filter(
          (variant) => variant.name === productOption
        )[0]?.variants
        // Append new container for productVariants
        const optionsContainer = self.find('.productOptions')
        const variantContainer = self.find('.productVariants')
        if (!variantContainer.length) {
          $(`
            <div class="productVariants"></div>
            <p class="currentSelectedVariant">
              Selected: <span>Please choose an option</span>
            </p>
          `).insertAfter(optionsContainer)
        }
        let id = self.attr('id')
        const container = self.find('.productVariants')
        $(container).empty()
        // Render color swatches
        $.each(variants, function (index, variant) {
          let swatchName = variant.title
            .split(' / ')[1]
            .replace(', ', '-')
            .toLowerCase()
          $(container).append(`
          <label class="variant-option-label ${
            !variant.available ? 'unavailable' : ''
          }" data-value=${swatchName}>
              <input class="variant-option" type="radio" name="color-option-${id}" data-value=${swatchName} value=${variant.id} ${!variant.available ? 'disabled' : ''}>
          </label>
        `)
        })
      }
    }
    const setDefaultOption = function () {
      const singleVariant = self.data('singleVariant')
      const product = self.data('product')
      // Check if it's a single variant product, if it's sold out, disable the ATC button
      if (singleVariant && !product.available) {
        self.find('.addToCart').text('Sold Out').attr('disabled', true)
      }
      // Check if the product has options
      const optionsAndVariants = self.data('optionsAndVariants')
      if (optionsAndVariants) {
        // Find the unit option that matches the defaultOption defined in settings
        const defaultOptionElement = self.find(
          `.unit-option[data-value='${clientSettings.defaultOption}']`
        )
        // Find all available variants
        const availableVariants = optionsAndVariants.reduce(
          (acc, currentOption) => {
            // If the current variant is available
            let variants = currentOption.variants.filter((variant) => {
              return variant.available
            })
            if (variants.length) {
              acc.push(...variants)
            }
            return acc
          },
          []
        )
        if (!availableVariants.length) {
          self.find('.addToCart').text('Sold Out').attr('disabled', true)
        }
        // Find matching variantId in availableVariants array
        const matchFound = availableVariants.some((variant) =>
          variant.title.includes(clientSettings.defaultOption)
        )
        // If found, select the defaultOptionElement
        if (matchFound) {
          $(defaultOptionElement).attr('checked', true)
        } else {
          // Else, select another option element
          const element = self.find('.unit-option')
          $.each(element, function (i, el) {
            if ($(el).data('value') !== clientSettings.defaultOption) {
              $(el).attr('checked', true)
            }
          })
        }
      }
    }
    const setDefaultColor = function () {
      // Check if there are colors that are available (in stock)
      const availableColors = self.find('.variant-option:enabled')
      if (availableColors.length) {
        const blackBrown = availableColors.filter(
          (i, el) => el.dataset.value === 'black-brown'
        )
        const black = availableColors.filter(
          (i, el) => el.dataset.value === 'black'
        )
        const others = availableColors.filter((i, el) => {
          return (
            el.dataset.value !== 'black-brown' || el.dataset.value !== 'black'
          )
        })
        if (blackBrown.length) {
          return $(blackBrown[0]).attr('checked', true)
        } else if (black.length) {
          return $(black[0]).attr('checked', true)
        } else {
          return $(others[0]).attr('checked', true)
        }
      }
    }
    const handleQuantity = function () {
      // Change background color of quantity buttons on click
      $('body').on('mousedown', '.quantity-button', function (e) {
        $(e.target).css('background-color', '#eee')
      })
      $('body').on('mouseup', '.quantity-button', function (e) {
        $(e.target).css('background-color', '#fff')
      })
      // Increment or decrement the target quantity
      self.on('click', '.quantity-down', function (e) {
        let qtySelector = $(this).siblings('.qtySelector')
        qtySelector.val(function (i, oldValue) {
          if (oldValue > 1) {
            return parseInt(oldValue, 10) - 1
          } else {
            return parseInt(oldValue, 10)
          }
        })
      })
      self.on('click', '.quantity-up', function () {
        let qtySelector = $(this).siblings('.qtySelector')
        qtySelector.val(function (i, oldValue) {
          return parseInt(oldValue, 10) + 1
        })
      })
    }
    const handleCartQuantity = function () {
      // Cart only needs event listeners once
      if (initCount === 0) {
        // Target cart quantity selectors
        $('#cartLineItems').on('click', '.quantity-down', function (e) {
          let qtySelector = $(this).siblings('.qtySelector')
          qtySelector.val(function (i, oldValue) {
            if (oldValue >= 1) {
              return parseInt(oldValue, 10) - 1
            } else {
              return parseInt(oldValue, 10)
            }
          })
          const variantId = $(this).closest('.cart-item').data().value
          const qty = parseInt(qtySelector.val(), 10)
          updateItems(variantId, qty)
        })
        $('#cartLineItems').on('click', '.quantity-up', function () {
          let qtySelector = $(this).siblings('.qtySelector')
          qtySelector.val(function (i, oldValue) {
            return parseInt(oldValue, 10) + 1
          })
          const variantId = $(this).closest('.cart-item').data().value
          const qty = parseInt(qtySelector.val(), 10)
          updateItems(variantId, qty)
        })
      }
    }
    const setSelectedText = function () {
      const colorOptions = self.data('colorOptions')
      if (colorOptions?.length) {
        const selectedUnit = self.find('.unit-option:checked').data('value')
        let selectedColor = self.find('.variant-option:checked').data('value')
        if (selectedColor === 'black-brown') {
          selectedColor = '1 x Black, 1 x Brown'
        } else {
          selectedColor =
            selectedColor.substring(0, 1).toUpperCase() +
            selectedColor.substring(1, selectedColor.length)
        }
        self
          .find('.currentSelectedVariant span')
          .text(`${selectedUnit} - ${selectedColor}`)
      }
    }
    /*
      Cart Functions
    */
    const createCart = function () {
      if (initCount === 0) {
        $('#cartWrapper').empty().append(`
          <div id="cartHeader">
            <h3>Your Bag</h3>
            <button id="closeCart">
              <img src="https://uploads-ssl.webflow.com/5e70f8e5d7461820999a0cf5/5e7b70d9dd8fc24bf01bc3be_close.svg" alt="Close Bag" />
            </button>
          </div>
          <div id="cartLineItems">
          </div>
          <div id="cartEmpty">
              <p>Your bag's empty 🛍. Go shopping!</p>
          </div>
          <button id="checkoutButton" class="btn">
            <img class="spinner" src="https://cdn.shopify.com/s/files/1/0250/1519/files/spinner.svg?v=1585762796" alt="Loading Checkout" />
            <span id="checkoutButtonText">Checkout</span>
          </button>
        `)
      }
    }
    const createCartAndCheckoutId = async function () {
      if (initCount === 0) {
        /* 
        IMPORANT: 
        Only 1 checkout is created for every instance on the same page / URL.
        This ensures we can run multiple instances of this Jquery plugin to render multiple products on the same page with a unified cart
      */
        // Check if checkout exists in localstorage
        const existingCheckoutId = JSON.parse(
          localStorage.getItem(lsCheckoutId)
        )
        // If checkout exists, fetch checkout by checkoutId
        if (existingCheckoutId) {
          await client.checkout
            .fetch(existingCheckoutId)
            .then(function (checkout) {
              if (checkout?.lineItems?.length) {
                extractLineItems(checkout.lineItems)
              }
              createCartItems()
            })
            .catch((error) => {
              console.log("Couldn't fetch checkout: ", error)
            })
        } else {
          await client.checkout
            .create()
            .then(function (checkout) {
              // Save new checkout ID to localstorage
              if (checkout && checkout.id) {
                persistTolocalStorage(lsCheckoutId, checkout.id)
              }
            })
            .catch((error) =>
              console.log("Couldn't create new checkout: ", error)
            )
        }
      }
    }
    /*
      Event Listeners 
    */
    const attachListeners = function () {
      const option = self.find('.unit-option')
      $(option).on('click', function (e) {
        createColors(e.target.dataset.value)
        setDefaultColor()
      })
      // Do not attach listeners more than once
      if (initCount === 0) {
        // Render colors when unit options are changed
        // Toggle cart drawer
        $('body').on(
          'click',
          '#overlay, #openCart, .addToCart, #closeCart',
          function (e) {
            event.stopPropagation()
            event.stopImmediatePropagation()
            toggleCart()
          }
        )
        $('body').on('click', '#modalOverlay', function (e) {
          event.stopPropagation()
          event.stopImmediatePropagation()
          toggleModal()
        })
      }
      // Add to cart handler
      self.find('.addToCart').on('click', function (e) {
        addItems(self)
      })
      // Handle removing line items in cart
      $('body').on('click', '.cart-item-remove', function (e) {
        removeItems(e.target.dataset.value)
      })
      // Checkout handler
      $('body').on('click', '#checkoutButton', async function (e) {
        await checkout()
      })
      // Set selected text for Liner
      self.on('click', '.unit-option, .variant-option', function (e) {
        setSelectedText()
      })
      // Handle quantity inputs and buttons
      handleQuantity()
      handleCartQuantity()
    }
    // Call API and fetch product
    await setup()
    // Only render plugin if product exists
    const product = self.data('product')
    if (product) {
      await initPlugin()
    }
  }
  $.fn.pluginUpsell = async function (options) {
    const self = this
    const upsellSettings = $.extend(
      {
        productHandle: 'peace-and-love',
      },
      options
    )
    if (!client) {
      console.log('Please initialize Client first.')
    } else {
      await fetchProduct(self, upsellSettings.productHandle)
      const product = self.data('product')
      if (product) {
        const optionsAndVariants = self.data('optionsAndVariants')
        const firstImage = product.images[0]
        if (initCount === 0) {
          $(self).append(`
            <h3 class="cartUpsellTitle">You might also like</h3>
          `)
        }
        $('#cartUpsells').append(`
          <div class="upsellItem">
            <img class="upsellItemImage" src="${firstImage.src}" alt="${firstImage.altText}">
            <div class="upsellItemDetails">
              <a class="upsellItemTitle">${product.title}</a>
              <select class="upsellProductOption"></select>
              <p class="upsellItemPrices"></p>
            </div>
            <button class="btn addToCart">
              <img class="spinner" src="https://cdn.shopify.com/s/files/1/0250/1519/files/spinner.svg?v=1585762796" alt="Loading Checkout" />
              <span class="addToCartText">Add</span>
            </button>
          </div>
        `)
        $('body').append(`
          <div id="modalOverlay"></div>
          <div id="upsellItemModal">
            <div id="upsellModalContainer">
              <div class="upsellItemImageContainer">
                <img class="upsellItemImage" src="${firstImage.src}" alt="${firstImage.altText}">
              </div>
              <div class="upsellItemDetails">
                <a class="upsellItemTitle">${product.title}</a>
                <select class="upsellProductOption"></select>
                <p class="upsellItemPrices"></p>
                <p class="upsellItemDescription">${product.description}</p>
                <button class="btn addToCart">
                  <img class="spinner" src="https://cdn.shopify.com/s/files/1/0250/1519/files/spinner.svg?v=1585762796" alt="Loading Checkout" />
                  <span class="addToCartText">Add To Cart</span>
                </button>
              </div>
              <button id="closeModal">
                <img src="https://uploads-ssl.webflow.com/5e70f8e5d7461820999a0cf5/5e7b70d9dd8fc24bf01bc3be_close.svg" alt="Close Bag" />
              </button>
            </div>
          </div>
        `)
        if (optionsAndVariants) {
          $.each(optionsAndVariants, function (
            productOptionIndex,
            productOption
          ) {
            const dropdown = $('body').find('.upsellProductOption')
            const container = self.find('.upsellItem')
            const id = self.attr('id')
            const firstVariant = productOption.variants[0]
            // First create the label and input for each product option
            $(dropdown).append(`
              <option class="unit-option" value='${
                firstVariant.id
              }' data-value='${productOption.name}' ${
              !firstVariant.available ? 'disabled' : ''
            }>
                ${productOption.name}
              </option>
            `)
            // Get the price of any variant within that product option
            const pricesContainer = container.find('.upsellItemPrices')[
              productOptionIndex
            ]
            const modalContainer = $('#upsellItemModal').find(
              '.upsellItemPrices'
            )[productOptionIndex]
            createPrices(firstVariant, pricesContainer)
            createPrices(firstVariant, modalContainer)
          })
        }
        /*
          Event Listeners 
        */
        $('#cart').on('change', '.upsellProductOption', function (e) {
          const variant = recursiveArraySearch(
            product.variants,
            e.target.value
          )[0]
          const container = self.find('.upsellItemPrices').empty()
          createPrices(variant, container)
        })
        $('#upsellItemModal').on('change', '.upsellProductOption', function (
          e
        ) {
          const variant = recursiveArraySearch(
            product.variants,
            e.target.value
          )[0]
          const container = $('#upsellItemModal')
            .find('.upsellItemPrices')
            .empty()
          console.log(container)
          createPrices(variant, container)
        })
        self.find('.addToCart').on('click', function (e) {
          addItems(self)
        })
        $('body').on('click', '.upsellItemTitle, #closeModal', function (e) {
          toggleModal()
        })
      }
    }
  }
  /*
      Helper Functions
    */
  const toggleModal = function () {
    if (cartOpen) {
      toggleCart()
    }
    modalOpen = !modalOpen
    $('body').toggleClass('modalOpen')
    $('#upsellItemModal').fadeToggle()
  }
  const persistToLocalStorage = function (key, value) {
    let valueJson = JSON.stringify(value)
    localStorage.setItem(key, valueJson)
  }
  const fetchFromLocalStorage = function (key) {
    return JSON.parse(localStorage.getItem(key))
  }
  const persistTolocalStorage = function (key, value) {
    var valueJson = JSON.stringify(value)
    localStorage.setItem(key, valueJson)
  }
  const extractLineItems = function (lineItems) {
    if (lineItems?.length) {
      const newLineItems = lineItems.map((item) => {
        return {
          title: item.title,
          subtitle: item.variant.title,
          ...item,
        }
      })
      persistToLocalStorage(lsCartId, newLineItems)
    } else {
      persistToLocalStorage(lsCartId, [])
    }
  }
  const setAddToCartLoading = function (boolean) {
    const element = $('.addToCart').not(':contains("Sold Out")')
    if (element) {
      if (boolean) {
        element.attr('disabled', true)
        element.find('.addToCartText').hide()
        element.find('.spinner').show()
      } else {
        element.attr('disabled', false)
        element.find('.spinner').hide()
        element.find('.addToCartText').show()
      }
    }
  }
  const setCheckoutLoading = function (boolean) {
    if (boolean) {
      $('#checkoutButton').attr('disabled', true)
      $('#checkoutButtonText').hide()
      $('#checkoutButton .spinner').show()
    } else {
      $('#checkoutButton').attr('disabled', false)
      $('#checkoutButton .spinner').hide()
      $('#checkoutButtonText').show()
    }
  }
  const toggleCart = function () {
    cartOpen = !cartOpen
    $('body').toggleClass('cartOpen')
  }
  const formatPrices = function (variant) {
    let variantPrices = null
    if (variant && variant?.presentmentPrices?.length) {
      const results = variant.presentmentPrices.filter(
        (item) => item.price.currencyCode === clientSettings.defaultCurrency
      )
      if (results?.length) {
        variantPrices = results[0]
      }
    }
    if (variantPrices) {
      const { price, compareAtPrice } = variantPrices
      let formattedPrice
      let formattedComparePrice
      // Formats prices currency format, supports multi-currency
      const priceFormatter = new Intl.NumberFormat(
        clientSettings.defaultRegion,
        {
          style: 'currency',
          currency: clientSettings.defaultCurrency,
          maximumSignificantDigits: 4, // Trim any zeros after decimal
        }
      )
      if (price?.amount) {
        formattedPrice = priceFormatter.format(price.amount)
      }
      if (compareAtPrice?.amount) {
        formattedComparePrice = priceFormatter.format(compareAtPrice.amount)
      }
      return {
        price: formattedPrice,
        comparePrice: formattedComparePrice,
      }
    }
  }
  // Render product variant pricing
  const createPrices = function (variant, container) {
    if (variant && container) {
      // If it's a single variant product
      const singleVariant = variant.length === 1
      const formattedPrices = formatPrices(variant)
      if (formattedPrices) {
        const { price, comparePrice } = formattedPrices
        $(container).append(`
          <p class="unit-price ${singleVariant ? 'single-product-price' : ''} ${
          comparePrice > price ? 'sale-price' : ''
        }">${
          comparePrice > price
            ? "<span class='unit-compare-price'>" + comparePrice + '</span>'
            : ''
        }
          ${price} ${
          clientSettings.defaultCurrency === 'USD'
            ? clientSettings.defaultCurrency
            : ''
        }
          </p>
        `)
      }
    }
  }
  const getOptionValues = function (product, name) {
    if (product?.options) {
      const productOptions = product.options.filter(
        (option) => option.name.toLowerCase() === name
      )
      const values = productOptions[0]?.values.map((option) => option.value)
      return values
    }
  }
  const recursiveArraySearch = function (array, searchString) {
    return array.filter(function search(row) {
      return Object.keys(row).some((key) => {
        if (typeof row[key] === 'string') {
          return row[key].toLowerCase().indexOf(searchString.toLowerCase()) > -1
        } else if (row[key] && typeof row[key] === 'object') {
          return search(row[key])
        }
        return false
      })
    })
  }
  const fetchProduct = async function (container, productHandle) {
    if (container && productHandle) {
      const self = $(container)
      // Render loading spinner
      self.html(`
      <div class="productSpinner">
        <img src="https://cdn.shopify.com/s/files/1/0250/1519/files/spinner.svg?v=1585762796" alt="Loading Checkout" />
      </div>
    `)
      // Fetch product by product handle
      await client.product
        .fetchByHandle(productHandle)
        .then((response) => {
          const product = response
          // Cache product data to memory
          self.data('product', product)
          // If product has unit and color options, save them to data
          const unitOptions = getOptionValues(product, 'units')
          const productOptions = product?.options
            .filter((option) => option.name.toLowerCase() !== 'title')
            .map((option) => option.name)
          const colorOptions = getOptionValues(product, 'color')
          const bundleOptions = getOptionValues(product, 'bundle')
          const singleVariant = product?.variants?.length === 1
          // Create a new array that contains the product variants grouped by unit options
          let optionsAndVariants = []
          if (unitOptions?.length) {
            for (let index in unitOptions) {
              let optionName = unitOptions[index]
              let variants = recursiveArraySearch(product.variants, optionName)
              optionsAndVariants.push({
                name: optionName,
                variants,
              })
            }
          } else if (bundleOptions?.length) {
            for (let index in bundleOptions) {
              let optionName = bundleOptions[index]
              let variants = recursiveArraySearch(product.variants, optionName)
              optionsAndVariants.push({
                name: optionName,
                variants,
              })
            }
          }
          // Only cache them to data if the options exist
          singleVariant && self.data('singleVariant', product?.variants[0])
          productOptions?.length && self.data('productOptions', productOptions)
          unitOptions?.length && self.data('unitOptions', unitOptions)
          colorOptions?.length && self.data('colorOptions', colorOptions)
          optionsAndVariants?.length &&
            self.data('optionsAndVariants', optionsAndVariants)
        })
        .catch((error) => console.log("Couldn't fetch product: ", error))
    }
  }
  const addUpsellItem = async function (variantId, qty = 1) {
    // Reset the item count so it will rerender the cart from scratch
    itemCount = 0
    // Set loading states for buttons
    setAddToCartLoading(true)
    setCheckoutLoading(true)
    const quantity = parseInt(qty, 10)
    const itemsToAdd = [
      {
        variantId,
        quantity,
      },
    ]
    const currentCheckoutId = fetchFromLocalStorage(lsCheckoutId)
    if (currentCheckoutId) {
      await client.checkout
        .addLineItems(currentCheckoutId, itemsToAdd)
        .then(function (checkout) {
          // Check to see if the item was added
          if (checkout.lineItems.length) {
            extractLineItems(checkout.lineItems)
          }
        })
        .catch((error) => console.log("Couldn't add item to checkout: ", error))
      // Set loading states for buttons to false
      setAddToCartLoading(false)
      setCheckoutLoading(false)
      // Rerender cart
      createCartItems()
      toggleCart()
    }
  }
  const addItems = async function (self) {
    // Reset the item count so it will rerender the cart from scratch
    itemCount = 0
    // Set loading states for buttons
    setAddToCartLoading(true)
    setCheckoutLoading(true)
    // Check if the cart has any items to add
    const currentCheckoutId = fetchFromLocalStorage(lsCheckoutId)
    let selectedVariantId

    // Check if the product is a single variant
    const singleVariant = self.data('singleVariant')
    if (singleVariant) {
      selectedVariantId = singleVariant.id
    } else {
      // Get the current selected variant option and find the variant ID
      const options = self.find("input[type='radio']:checked")
      if (options?.length) {
        selectedVariantId = options[options.length - 1]?.value
      } else {
        selectedVariantId = self.find('.upsellProductOption').val()
      }
    }
    // Find the current specified quantity to add
    const qty = parseInt(self.find('.qtySelector').val(), 10)
    // Format the line items for passing into checkout api
    const itemsToAdd = [
      {
        variantId: selectedVariantId,
        quantity: qty ? qty : 1, // If there's no qtySelector set default to 1
      },
    ]
    if (currentCheckoutId) {
      await client.checkout
        .addLineItems(currentCheckoutId, itemsToAdd)
        .then(function (checkout) {
          // Check to see if the item was added
          if (checkout.lineItems.length) {
            extractLineItems(checkout.lineItems)
          }
        })
        .catch((error) => console.log("Couldn't add item to checkout: ", error))
      // Set loading states for buttons to false
      setAddToCartLoading(false)
      setCheckoutLoading(false)
      // Rerender cart
      createCartItems()
      toggleCart()
    }
  }
  const createCartItems = function () {
    if (itemCount === 0) {
      $('#cartLineItems').empty()
    }
    const cartItems = fetchFromLocalStorage(lsCartId)
    // Render items in checkout in cart
    if (cartItems?.length) {
      $('#checkoutButton').show()
      $('#cartEmpty').hide()
      // For each item in cartItems, render until they've all been rendered
      for (itemCount; itemCount <= cartItems.length - 1; ) {
        cartItems.map(function (item) {
          const { variant } = item
          const formattedPrices = formatPrices(variant)
          const { price, comparePrice } = formattedPrices
          $('#cartLineItems').append(`
            <div class="cart-item" data-value="${item.id}">
            ${
              variant?.image?.src
                ? `<img src="${variant.image.src}" alt="${variant.image?.altText}"/>`
                : `<img src="https://uploads-ssl.webflow.com/5e70f8e5d7461820999a0cf5/5e83a3654bfbfa1aa178d629_placeholder.jpg" alt="${item.title}"/>`
            }
              <div class="cart-item-details">
                <p class="cart-item-title">${item.title}</p>
                ${
                  // Don't show the variant title if it's a single variant product
                  item.subtitle.toLowerCase().includes('default title')
                    ? ''
                    : `<p class='cart-item-subtitle'>${item.subtitle}</p>`
                }
                <p class="cart-item-price unit-price ${
                  comparePrice > price ? 'sale-price' : ''
                }">
                  ${
                    comparePrice > price
                      ? `<span class='unit-compare-price'>${comparePrice}</span>`
                      : ''
                  }
                  ${price} ${clientSettings.defaultCurrency === 'USD' ? clientSettings.defaultCurrency : ''}</p>
                <div class="quantity">
                  <button class="quantity-button quantity-down">-</button>
                  <input class="qtySelector" type="number" min="0" value="${
                    item.quantity
                  }" data-value="${variant.id}" />
                  <button class="quantity-button quantity-up">+</button>
                </div>
                <span class="cart-item-remove" data-value="${
                  item.id
                }">Remove</span>
              </div>
            </div>
          `)
          // Increment the item count so we know we rendered all the items and won't fire on subsequent instances
          itemCount++
        })
        const totalCartQty = cartItems.reduce((acc, item) => {
          return acc + item.quantity
        }, 0)
        $('#cartCount').text(totalCartQty)
      }
    } else {
      $('#cartEmpty').show()
      $('#checkoutButton').hide()
      $('#cartCount').text(0)
    }
  }
  const removeItems = async function (variantId) {
    // Reset the item count so it will rerender the cart from scratch
    itemCount = 0
    // Set loading states for buttons
    setCheckoutLoading(true)
    // Check if the cart has any items to add
    const currentCheckoutId = fetchFromLocalStorage(lsCheckoutId)
    // Format the line items for passing into checkout api
    const itemsToRemove = [variantId]
    await client.checkout
      .removeLineItems(currentCheckoutId, itemsToRemove)
      .then(function (checkout) {
        extractLineItems(checkout.lineItems)
      })
      .catch((error) =>
        console.log("Couldn't remove item from checkout: ", error)
      )
    // Set loading states for buttons to false
    setCheckoutLoading(false)
    // Rerender cart
    createCartItems()
  }
  const updateItems = async function (variantId, qty) {
    // Reset the item count so it will rerender the cart from scratch
    itemCount = 0
    // Set loading states for buttons
    setAddToCartLoading(true)
    setCheckoutLoading(true)
    // Check if the cart has any items to add
    const currentCheckoutId = fetchFromLocalStorage(lsCheckoutId)
    // Get the current selected variant option and find the variant ID
    // Format the line items for passing into checkout api
    const itemsToUpdate = [
      {
        id: variantId,
        quantity: qty,
      },
    ]
    await client.checkout
      .updateLineItems(currentCheckoutId, itemsToUpdate)
      .then(function (checkout) {
        extractLineItems(checkout.lineItems)
      })
      .catch((error) =>
        console.log("Couldn't update items in checkout: ", error)
      )
    // Set loading states for buttons to false
    setAddToCartLoading(false)
    setCheckoutLoading(false)
    // Rerender cart
    createCartItems()
  }
  const checkout = async function () {
    setCheckoutLoading(true)
    const currentCheckoutId = fetchFromLocalStorage(lsCheckoutId)
    await client.checkout.fetch(currentCheckoutId).then((checkout) => {
      // Do something with the checkout
      if (checkout.webUrl) {
        location.href = checkout.webUrl
      }
    })
  }
})(jQuery)
