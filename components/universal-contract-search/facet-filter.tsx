import { Facet } from "./typesense-types";
import {
  Flex,
  Icon,
  IconButton,
  Popover,
  PopoverBody,
  PopoverCloseButton,
  PopoverContent,
  PopoverTrigger,
} from "@chakra-ui/react";
import { FiChevronDown, FiChevronUp, FiX } from "react-icons/fi";
import { Button, Card, Checkbox, Heading, Text } from "tw-components";

type FacetFilterProps = {
  name: string;
  facetGroups: FacetFilterSectionProps[];
  selectedValues: string[];
  onChange: (values: string[]) => void;
};

export const FacetFilter: React.FC<FacetFilterProps> = ({
  name,
  facetGroups,
  onChange,
  selectedValues,
}) => {
  return (
    <Popover offset={[0, 0]} isLazy lazyBehavior="unmount">
      {({ isOpen, onClose }) => (
        <>
          <PopoverTrigger>
            <Button
              size="xs"
              variant="outline"
              rightIcon={<Icon as={isOpen ? FiChevronUp : FiChevronDown} />}
            >
              {name}
            </Button>
          </PopoverTrigger>

          <Card
            maxW="md"
            minW="300px"
            w="auto"
            as={PopoverContent}
            bg="backgroundBody"
            mx={6}
            p={4}
            maxH="400px"
            overflowY="auto"
          >
            <PopoverBody as={Flex} p={0} gap={4} flexDirection="column">
              <Flex gap={8} align="center" justify="space-between">
                <Heading as="h4" size="label.lg">
                  {name}
                </Heading>
                <IconButton
                  icon={<Icon as={FiX} />}
                  aria-label="close"
                  variant="ghost"
                  onClick={onClose}
                />
              </Flex>
              {facetGroups.map((facetGroup) => (
                <FacetFilterSection
                  key={`${facetGroup.title}_${facetGroup.values.join("_")}`}
                  title={facetGroup.title}
                  values={facetGroup.values}
                  onChange={onChange}
                  selectedValues={selectedValues}
                />
              ))}
            </PopoverBody>
          </Card>
        </>
      )}
    </Popover>
  );
};

type FacetFilterSectionProps = {
  title?: string;
  values: Array<{ label?: string; value: string[] }>;
  allOnly?: boolean;
};

const FacetFilterSection: React.FC<
  FacetFilterSectionProps &
    Pick<FacetFilterProps, "onChange" | "selectedValues">
> = ({ title, values, selectedValues, onChange, allOnly = false }) => {
  return (
    <Flex direction="column" gap={1}>
      {title && (
        <Heading mb={2} color="faded" as="label" size="subtitle.xs">
          {title}
        </Heading>
      )}
      {values.map((value) => (
        <Flex
          py={1}
          key={value.value.join("_")}
          align="center"
          gap={4}
          justify="space-between"
          role="group"
        >
          <Flex gap={2} align="center">
            <Checkbox
              id={value.value.join("_")}
              onChange={() => {
                if (allOnly) {
                  onChange(value.value);
                } else if (
                  value.value.every((r) => selectedValues.includes(r))
                ) {
                  onChange(
                    selectedValues.filter((v) => !value.value.includes(v)),
                  );
                } else {
                  onChange([...selectedValues, ...value.value]);
                }
              }}
              colorScheme="primary"
              // it's checked if all the values are selected
              isChecked={value.value.every((r) => selectedValues.includes(r))}
            />
            <Heading
              w="100%"
              as="label"
              size="label.md"
              cursor="pointer"
              {...{ htmlFor: value.value.join("_") }}
            >
              {value.label || value.value.join(", ")}
            </Heading>
          </Flex>
          <Button
            size="sm"
            rounded="full"
            onClick={() => onChange(value.value)}
            opacity={0}
            _groupHover={{ opacity: 1 }}
            transition="opacity 0.2s"
            willChange="opacity"
            variant="ghost"
            colorScheme="primary"
          >
            Only
          </Button>
        </Flex>
      ))}
    </Flex>
  );
};
