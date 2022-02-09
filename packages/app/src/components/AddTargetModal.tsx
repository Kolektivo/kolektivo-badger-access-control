import React, { useState } from "react"
import { Box, Button, InputLabel, makeStyles, MenuItem, Select, Typography } from "@material-ui/core"
import { ethers } from "ethers"
import Modal from "./commons/Modal"
import { TextField } from "./commons/input/TextField"
import AddIcon from "@material-ui/icons/Add"
import { ExecutionOptions, Target } from "../typings/role"

const useStyles = makeStyles((theme) => ({
  label: {
    color: theme.palette.text.primary,
    marginBottom: theme.spacing(1),
  },
}))

type Props = {
  type: string
  isOpen: boolean
  onClose: () => void
  onAddTarget: (target: Target) => void
}

const AddTargetModal = ({ type, onAddTarget, onClose, isOpen }: Props): React.ReactElement => {
  const classes = useStyles()
  const [address, setAddress] = useState("")
  const [executionOptions, setExecutionOptions] = useState(ExecutionOptions.NONE)
  const [isValidAddress, setIsValidAddress] = useState(false)

  const onAddressChange = (address: string) => {
    setIsValidAddress(ethers.utils.isAddress(address))
    setAddress(address)
  }

  const handleChangeExecutionsOptions = (value: string) => {
    setExecutionOptions(value as ExecutionOptions)
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <Typography variant="h4">Add a {type}</Typography>
      <Box sx={{ mt: 1 }}>
        <Typography variant="body1">
          Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod.
        </Typography>
      </Box>
      <Box sx={{ mt: 2 }}>
        <TextField
          onChange={(e) => onAddressChange(e.target.value)}
          label={`${type} address`}
          placeholder={`Add a new ${type} address`}
        />
      </Box>
      <Box sx={{ mt: 2 }}>
        <InputLabel className={classes.label}>Execution Type</InputLabel>
        <Select value={executionOptions} onChange={(e) => handleChangeExecutionsOptions(e.target.value as string)}>
          {Object.values(ExecutionOptions).map((options) => (
            <MenuItem value={options}>{options}</MenuItem>
          ))}
        </Select>
      </Box>

      <Box sx={{ mt: 2 }}>
        <Button
          fullWidth
          color="secondary"
          size="large"
          variant="contained"
          onClick={() => onAddTarget({ address, executionOptions })}
          disabled={!isValidAddress}
          startIcon={<AddIcon />}
        >
          Add {type}
        </Button>
      </Box>
    </Modal>
  )
}

export default AddTargetModal
