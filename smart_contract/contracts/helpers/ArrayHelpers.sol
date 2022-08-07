// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

contract ArrayHelpers {
    /**
     * @dev Internal function. Add an address into an 
     *      array of unique address.
     *
     * @param addAddress Address want to add.
     * @param addressArray Array of unique address.
     */
    function _addAddressToUniqueAddressArray(
        address addAddress, address[] storage addressArray
    ) internal {
        bool exist = false;
        for (uint i = 0; i< addressArray.length; i++){
            if(addressArray[i] == addAddress){
                exist = true;
                break;
            }
        }
        if(!exist){
            addressArray.push(addAddress);
        }
    }

    /**
     * @dev Internal function. Remove address from an 
     *      array of unique address.
     *
     * @param removeAddress Address want to remove.
     * @param addressArray Array of unique address.
     */
    function _removeAddressFromUniqueAddressArray(
        address removeAddress, address[] storage addressArray
    ) internal {
        for (uint i = 0; i< addressArray.length; i++){
            if(addressArray[i] == removeAddress){
                addressArray[i] = addressArray[addressArray.length - 1];
                addressArray.pop();
                break;
            }
            
        }
    }
}